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
  const server = createAssistantServer({ evaluate, mint }); running.push(server);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  const context = { ...contextOf(createSession()), checks: ['preparation-0', 'preparation-1', 'preparation-2'] };
  let token = '';
  async function post(path: string, body: unknown, origin = 'http://127.0.0.1:5180') {
    return fetch(`http://127.0.0.1:${port}/api/assistant/${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  }
  const session = await (await post('session', { context })).json(); token = session.token;
  return { context, post, evaluate, mint, decide: (sequence = 1) => post('decide', { revision: 0, sequence, turns: [{ id: `t${sequence}`, text: 'Ho controllato, possiamo proseguire' }] }) };
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
