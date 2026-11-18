import { applyAuthorized } from './assessment';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createAssistantServer } from '../../server/app';
import { realtimeConfig } from '../../server/provider';
import { contextOf } from './protocol';
import { createSession } from '../flow';
const running: Server[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(s => new Promise<void>(r => s.close(() => r())))); });
async function setup() {
  const evaluate = vi.fn().mockResolvedValue({ type: 'PROPOSE_ACTION', guidelineId: 'preparation:overview', action: 'complete_step', targetId: 'preparation' });
  const mint = vi.fn().mockResolvedValue({ value: 'ephemeral-test-secret' });
  const interpret = vi.fn().mockResolvedValue({ intent: 'complete', message: '', sources: [], data: [], checks: [], eventNow: false });
  const server = createAssistantServer({ evaluate, mint, interpret }); running.push(server);

  const context = { ...contextOf(createSession()), checks: ['preparation-0', 'preparation-1', 'preparation-2'] };
  let token = '';
  async function post(path: string, body: unknown, origin = 'http://127.0.0.1:5180') {
    return new Promise<{ status: number; json: () => Promise<any> }>(resolve => {
      const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { method: 'POST', url: `/api/assistant/${path}`, headers: { origin, host: '127.0.0.1:5180', 'content-type': 'application/json', authorization: `Bearer ${token}` } });
      const res = Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false, status: 0,
        writeHead(status: number) { this.status = status; },
        end(text: string) { this.writableEnded = true; resolve({ status: this.status, json: async () => JSON.parse(text) }); },
      });
      server.emit('request', req, res);
    });
  }
  const session = await (await post('session', { context })).json(); token = session.token;
  return { context, post, evaluate, mint, interpret, decide: (sequence = 1) => post('decide', { revision: 0, sequence, turns: [{ id: `t${sequence}`, text: 'Ho controllato, possiamo proseguire' }] }) };
}
describe('API locale e conferme', () => {
  it('disabilita le risposte automatiche e mantiene le interruzioni', () => expect(realtimeConfig().session.audio.input.turn_detection).toMatchObject({ create_response: false, interrupt_response: true, type: 'semantic_vad' }));
  it('rifiuta richieste da siti esterni prima di chiamare il provider', async () => {
    const { post, mint, context } = await setup(); expect((await post('session', { context }, 'https://example.com')).status).toBe(403); expect(mint).toHaveBeenCalledOnce();
  });
  it('applica solo una proposta valida, una volta', async () => {
    const { post, decide } = await setup(); const d = await (await decide()).json();
    expect((await post('action', { revision: 0, proposalId: 'forged', accept: true })).status).toBe(409);
    const body = { revision: 0, proposalId: d.proposalId, accept: true };
    expect(await (await post('action', body)).json()).toMatchObject({ applied: true, next: 'birth' }); expect((await post('action', body)).status).toBe(409);
  });
  it('invalida una proposta se cambia la checklist', async () => {
    const { post, context, decide } = await setup(); const d = await (await decide()).json();
    expect((await post('context', { context: { ...context, revision: 1, checks: [] } })).status).toBe(200);
    expect((await post('action', { revision: 1, proposalId: d.proposalId, accept: true })).status).toBe(409);
  });
  it('rifiuta turni duplicati e sopprime interventi ripetuti', async () => {
    const { decide, evaluate } = await setup(); await decide(); expect((await decide()).status).toBe(409);
    expect(await (await decide(2)).json()).toEqual({ type: 'IGNORE' }); expect(evaluate).toHaveBeenCalledTimes(2);
  });
  it('chiudere la sessione revoca le successive azioni', async () => {
    const { post, decide } = await setup(); await post('stop', {}); expect((await decide()).status).toBe(401);
  });
  it('non trasforma una mancata configurazione in una credenziale fittizia', async () => {
    const { post, mint, context } = await setup(); mint.mockRejectedValueOnce(new Error('Configura OPENAI_API_KEY'));
    const response = await post('session', { context }); expect(response.status).toBe(502); expect(await response.json()).not.toHaveProperty('clientSecret');
  });
});


describe('API guidata in memoria: sessioni, visite e turni', () => {
  it('autorizza l’avanzamento senza proposta e rifiuta turni duplicati', async () => {
    const { context, post } = await setup();
    const body = { revision: 0, visit: context.visit, sessionKey: context.sessionKey, sequence: 1, turn: { id: 'full', text: 'Ho fatto tutto, avanti' } };
    const result = await (await post('turn', body)).json();
    expect(result.action).toMatchObject({ intent: 'complete', next: 'birth', visit: context.visit, turn: 'full' });
    expect(result.message).toBe(''); expect(result).not.toHaveProperty('proposalId');
    expect((await post('turn', { ...body, sequence: 2 })).status).toBe(409);
    expect((await post('turn', { ...body, sequence: 3, visit: 'old' })).status).toBe(409);
  });
  it('scarta una valutazione se cambia step mentre il modello risponde', async () => {
    const { context, post, interpret } = await setup(); let release!: (value: unknown) => void;
    interpret.mockImplementationOnce(() => new Promise(r => { release = r; }));
    const waiting = post('turn', { revision: 0, visit: context.visit, sessionKey: context.sessionKey, sequence: 1, turn: { id: 'late', text: 'Avanti' } });
    await new Promise<void>(r => setImmediate(r));
    expect((await post('context', { context: { ...context, checks: [], step: 'birth', revision: 1, visit: 'next' } })).status).toBe(200);
    release({ intent: 'complete', data: [], sources: [], checks: [], message: '' });
    expect((await waiting).status).toBe(409);
  });
});


describe('API Realtime diretta', () => {
  it('decide prima del parlato e impedisce di applicare due volte il turno', async () => {
    const { post, context, evaluate, interpret } = await setup();
    const identity = { revision: 0, visit: context.visit, sessionKey: context.sessionKey };
    const config = await (await post('realtime-config', identity)).json();
    expect(config.tools).toHaveLength(7); expect(config.instructions).toContain('Step preparation');
    const registered = await (await post('utterance', { ...identity, turn: { id: 'native', text: 'Ho fatto tutto avanti' } })).json();
    expect(registered.guided).toMatchObject({ action: { next: 'birth', intent: 'complete' } });
    const batch = { ...identity, turnId: 'native', sequence: 1, calls: [{ id: 'native-call', name: 'completa_step', arguments: {} }] };
    expect((await post('realtime-tools', batch)).status).toBe(409);
    expect((await post('realtime-tools', { ...batch, sequence: 2 })).status).toBe(409);
    expect(evaluate).not.toHaveBeenCalled(); expect(interpret).toHaveBeenCalledOnce();
  });
  it('non conserva osservazioni speculative prima dell’applicazione nell’app', async () => {
    const { post, context, interpret } = await setup();
    interpret.mockResolvedValueOnce({ intent: 'observe', message: '', sources: [], data: [{ field: 'hr', value: 100 }], checks: [], eventNow: false });
    const c = { ...context, step: 'hr100', checks: [], revision: 1, visit: 'measurement' };
    await post('context', { context: c });
    const identity = { revision: c.revision, visit: c.visit, sessionKey: c.sessionKey };
    const result = (await (await post('utterance', { ...identity, turn: { id: 'measure', text: 'FC 100' } })).json()).guided;
    expect(result.observations.hr.value).toBe(100);
    const config = await (await post('realtime-config', identity)).json(); expect(config.instructions).toContain('"observations":{}');
    await post('context', { context: { ...c, revision: 2, observations: result.observations } });
    const updated = await (await post('realtime-config', { ...identity, revision: 2 })).json(); expect(updated.instructions).toContain('"hr":{"value":100');
  });
  it('rifiuta strumenti senza trascrizione e turni di visite precedenti', async () => {
    const { post, context } = await setup();
    const identity = { revision: 0, visit: context.visit, sessionKey: context.sessionKey };
    expect((await post('realtime-tools', { ...identity, turnId: 'unknown', sequence: 1, calls: [] })).status).toBe(409);
    expect((await post('realtime-config', { ...identity, visit: 'old' })).status).toBe(409);
  });
});


it('dalla home applica una nascita interpretata prima di generare il parlato', async () => {
  const { post, context, interpret } = await setup();
  interpret.mockResolvedValueOnce({ intent: 'birth', message: 'Passiamo al cordone', sources: [], data: [], checks: [], eventNow: true });
  const result = await (await post('utterance', { revision: 0, visit: context.visit, sessionKey: context.sessionKey, turn: { id: 'birth-home', text: 'La piccola è venuta al mondo in questo momento' } })).json();
  const session = { ...createSession(context.sessionKey), enteredAt: context.sessionKey };
  expect(result.guided.action.intent).toBe('birth');
  expect(applyAuthorized(session, result.guided.action).step).toBe('cord');
});

it.each(['preparation', 'cord', 'hr60'] as const)('applica un evento anche se il modello lo presenta come orientamento: %s', async step => {
  const { post, context, interpret } = await setup();
  const current = { ...context, checks: [], step, visit: 'event-' + step, revision: 1 };
  await post('context', { context: current });
  interpret.mockResolvedValueOnce({ intent: 'orient', event: 'birth', scenario: step === 'cord' ? 'cord' : 'birth', message: '', sources: [], data: [], checks: [], eventNow: true });
  const result = await (await post('utterance', { revision: 1, visit: current.visit, sessionKey: current.sessionKey, turn: { id: 'semantic-event-' + step, text: 'Il neonato è venuto al mondo' } })).json();
  expect(result.guided.action.intent).toBe('birth');
});

it('mantiene l’italiano come impostazione vocale della sessione', () => {
  expect(realtimeConfig().session.instructions).toContain('italiano (it-IT)');
  expect(realtimeConfig().session.instructions).toContain('fin dalla prima parola');
});
