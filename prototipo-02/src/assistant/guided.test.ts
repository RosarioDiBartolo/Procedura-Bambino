import { guidelinesFor } from './guidelines';
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assess, applyAuthorized, visitOf, type Observations, type Value } from './assessment';
import { createSession, move, steps, type StepId } from '../flow';
import { contextOf } from './protocol';
import { introduction, newDialogue, promptFor, resolveTurn } from '../../server/guided';
const obs = (data: Record<string, Value>): Observations => Object.fromEntries(Object.entries(data).map(([field, value]) => [field, { value, source: 'voice', at: 1 }]));
const raw = (data: Record<string, Value> = {}, intent = 'observe') => ({ intent, data: Object.entries(data).map(([field, value]) => ({ field, value })), message: 'Testo dalla fonte', sources: ['initial:overview'], checks: [], eventNow: false });
describe('Regole condivise voce e campi', () => {
  it.each([
    ['initial', { term: false }, 'first-actions'], ['initial', { term: true, tone: true, breathing: true }, 'skin'],
    ['respiration', { apnea: true }, 'ppv'], ['respiration', { hr: 60 }, 'ppv'], ['respiration', { hr: 100, apnea: false }, 'distress'],
    ['distress', { difficulty: true }, 'distress-support'], ['distress', { cyanosis: true }, 'distress-support'], ['distress', { difficulty: false, cyanosis: false }, 'skin'],
    ['hr100', { hr: 100 }, 'post'], ['hr100', { hr: 99 }, 'correctives'], ['hr60', { hr: 60 }, 'hr100'],
    ['hr60', { hr: 59, effective: true }, 'compressions'], ['hr60', { effective: false }, 'correctives'],
    ['advanced-hr', { hr: 60 }, 'recovery-review'], ['advanced-hr', { hr: 59 }, 'medication'],
    ['hr100', { hr: 'below100' }, 'correctives'], ['hr60', { hr: 'below60', effective: true }, 'compressions'],
  ] as [StepId, Record<string, Value>, StepId][])('%s con %j conduce a %s', (step, values, next) => expect(assess(step, obs(values)).next).toBe(next));
  it.each([
    ['initial', { term: true }], ['respiration', { apnea: false }], ['distress', { difficulty: false }],
    ['hr60', { hr: 59 }], ['hr60', { hr: 'below100', effective: true }], ['hr100', { hr: null }],
  ] as [StepId, Record<string, Value>][])('mantiene sconosciuti e prerequisiti in %s', (step, values) => expect(assess(step, obs(values)).next).toBeUndefined());
  it('non riusa osservazioni in una nuova visita e scarta azioni duplicate o superate', () => {
    const s = { ...createSession(1), step: 'hr60' as const, observations: { visit: 'old', values: obs({ hr: 50, effective: true }) } };
    const a = { sessionKey: 1, visit: visitOf(s), turn: 'a', intent: 'observe' as const, next: 'compressions' as const };
    expect(applyAuthorized(s, a).step).toBe('hr60');
    const fresh = { ...s, observations: { visit: visitOf(s), values: obs({ hr: 50, effective: true }) } };
    const next = applyAuthorized(fresh, a, 10); expect(next.step).toBe('compressions');
    expect(applyAuthorized(next, a)).toBe(next);
  });
  it('registra una sola somministrazione esplicita e nessuna implicita', () => {
    const s = { ...createSession(1), step: 'medication' as const };
    const a = { sessionKey: 1, visit: visitOf(s), turn: 'dose', intent: 'medication' as const };
    const next = applyAuthorized(s, a, 3); expect(next.lastMedicationAt).toBe(3);
    expect(applyAuthorized(next, a).events.filter(e => e.type === 'medication')).toHaveLength(1);
    expect(applyAuthorized(s, { ...a, intent: 'complete', next: 'advanced-hr' }, 4).lastMedicationAt).toBeNull();
  });
});
describe('Collaudo conversazionale simulato con interpretazioni controllate', () => {
  it('raccoglie progressivamente e chiede solo la prima informazione mancante', () => {
    const c = { ...contextOf(createSession(1)), step: 'initial' as const }; const d = newDialogue();
    const first = resolveTurn(c, d, raw({ term: true }), { id: '1', text: 'A termine' }); expect(first.question).toBe('tone');
    const second = resolveTurn(c, d, raw({ tone: true }), { id: '2', text: 'Sì' }); expect(second.question).toBe('breathing');
    const third = resolveTurn(c, d, raw({ breathing: true }), { id: '3', text: 'Sì respira' }); expect(third.action.next).toBe('skin'); expect(third.message).toBe('');
  });
  it.each(['Forse è sotto 100', 'Se fosse sotto 100', 'È sotto 100?', 'Non so la frequenza'])('non conferma %s', text => {
    const c = { ...contextOf(createSession()), step: 'hr100' as const }; const d = newDialogue();
    expect(resolveTurn(c, d, raw({ hr: 50 }), { id: '1', text }).action.next).toBeUndefined(); expect(d.observations).toEqual({});
  });
  it('tratta l’intero turno come aggiornamento atomico e conserva le soglie', () => {
    const c = { ...contextOf(createSession()), step: 'hr100' as const }; const d = newDialogue();
    const result = resolveTurn(c, d, raw({ hr: 'atLeast100' }), { id: '1', text: 'Sotto 100, anzi almeno 100' });
    expect(result.action.next).toBe('post'); expect(d.observations.hr?.value).toBe('atLeast100');
  });
  it('risponde su altri step e dichiara l’assenza di fonte', () => {
    const c = contextOf(createSession()); const d = newDialogue();
    const answer = resolveTurn(c, d, { ...raw({}, 'question'), sources: ['medication:overview'] }, { id: '1', text: 'Cosa succede con adrenalina?' }); expect(answer.sources).toEqual(['medication:overview']);
    expect(resolveTurn(c, d, { ...raw({}, 'question'), sources: [] }, { id: '2', text: 'Quale dose non documentata?' }).message).toContain('non contengono');
  });
  it('chiarisce orari ambigui senza registrare eventi e consente il ritorno', () => {
    const s = move(createSession(1), 'birth', 2, 'test'); const d = newDialogue();
    expect(resolveTurn(contextOf(s), d, raw({}, 'birth'), { id: '1', text: 'Nascita un po’ fa' }).action.intent).toBe('other');
    const explicit = resolveTurn(contextOf(s), d, raw({}, 'birth'), { id: '2', text: 'Nascita adesso' });
    expect(applyAuthorized(s, explicit.action, 3).birthAt).toBe(3);
    const back = resolveTurn(contextOf(s), d, raw({}, 'back'), { id: '3', text: 'Torna indietro' });
    expect(applyAuthorized(s, back.action, 4).events.at(-1)?.type).toBe('correction');
  });
  it('carica 18 prompt e include tutti gli interventi nelle introduzioni', async () => {
    for (const step of Object.values(steps)) {
      expect(await promptFor(step.id)).toContain(`Step ${step.id}`);
      for (const action of step.actions ?? []) expect(introduction(step.id)).toContain(action);
    }
  });
  it('presenta direttamente la procedura senza menzionare il poster nel parlato', () => {
    for (const id of Object.keys(steps) as StepId[]) for (const source of guidelinesFor(id)) expect(source.text).not.toMatch(/poster/i);
    const r = resolveTurn(contextOf(createSession()), newDialogue(), { ...raw({}, 'question'), message: 'Il poster indica la preparazione.' }, { id: 'source-style', text: 'Cosa devo fare?' });
    expect(r.message).toBe('La procedura indica la preparazione.');
  });

});
