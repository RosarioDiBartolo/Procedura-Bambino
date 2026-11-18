import { applyAuthorized } from './assessment';
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { executeTools, nativeConfiguration } from '../../server/native-realtime';
import { newDialogue } from '../../server/guided';
import { contextOf } from './protocol';
import { createSession } from '../flow';
import type { ToolCall } from './realtime-tools';
const call = (name: ToolCall['name'], args: Record<string, unknown> = {}, id: string = name): ToolCall => ({ name, arguments: args, id });
const context = (step: ReturnType<typeof createSession>['step']) => ({ ...contextOf(createSession(1)), step });
describe('Strumenti Realtime: interpretazione controllata, regole applicative', () => {
  it('fornisce tutta la procedura e ricarica i prompt per ogni configurazione', async () => {
    const config = await nativeConfiguration(context('hr60'), newDialogue());
    expect(config.instructions).toContain('Step hr60'); expect(config.instructions).toContain('Counseling');
    expect(config.instructions).toContain('DOPPES'); expect(config.tools).toHaveLength(7);
    expect(config.nextQuestion).toContain('frequenza cardiaca');
  });
  it.each(['Ho completato tutta la preparazione', 'Preparazione finita', 'Ho fatto tutto'])('avanza alla nascita senza un secondo comando: %s', text => {
    const session = createSession(1);
    const result = executeTools(contextOf(session), newDialogue(), [call('completa_step')], { id: 'completion', text });
    expect(result.action.next).toBe('birth');
    expect(result.message).toBe('');
    const next = applyAuthorized(session, result.action, 2);
    expect(next.step).toBe('birth');
    expect(next.birthAt).toBeNull();
  });
  it('istruisce il modello ad avanzare sulla dichiarazione di completamento senza chiedere avanti', async () => {
    const config = await nativeConfiguration(context('preparation'), newDialogue());
    expect(config.instructions).toContain('anche senza la parola “avanti”');
    expect(config.instructions).toContain('Non chiedere conferma');
    expect(config.tools.find(tool => tool.name === 'completa_step')?.description).toContain('Non richiede la parola avanti');
  });
  it('riallinea la temperatura alta dalla preparazione alla valutazione, senza inventare nascita o stabilità', () => {
    const session = createSession(1);
    const result = executeTools(contextOf(session), newDialogue(), [call('orienta_scenario', { scenario: 'temperature', data: [] })], { id: 'temperature', text: 'La temperatura del bambino è molto alta' });
    const next = applyAuthorized(session, result.action, 2);
    expect(next.step).toBe('initial');
    expect(next.birthAt).toBeNull();
    expect(next.checks).toEqual({});
    expect(next.observations?.values).toEqual({});
    expect(result.message).toContain('chiedi il valore misurato');
    expect(applyAuthorized(next, result.action, 3)).toBe(next);
  });
  it('conserva la FC già riferita riallineando la fase senza avviare compressioni', () => {
    const session = createSession(1);
    const result = executeTools(contextOf(session), newDialogue(), [call('orienta_scenario', { scenario: 'respiration', data: [{ field: 'hr', value: 50 }] })], { id: 'low-hr', text: 'Il bambino ha una frequenza di 50' });
    const next = applyAuthorized(session, result.action, 2);
    expect(next.step).toBe('ppv');
    expect(next.observations?.values.hr?.value).toBe(50);
    expect(next.events.at(-1)?.text).toContain('Dati attuali già sufficienti');
  });
  it.each(['Se la temperatura fosse alta?', 'Forse il bambino è già nato', 'Temperatura alta, anzi non so'])('non riallinea ipotesi o incertezze: %s', text => {
    expect(() => executeTools(context('preparation'), newDialogue(), [call('orienta_scenario', { scenario: 'temperature', data: [] })], { id: 'uncertain', text })).toThrow();
  });
  it('non retrocede dalla fase avanzata per una temperatura riferita', () => {
    const result = executeTools(context('hr60'), newDialogue(), [call('orienta_scenario', { scenario: 'temperature', data: [] })], { id: 'temperature', text: 'Il bambino ha la temperatura alta' });
    expect(result.action.next).toBeUndefined();
    expect(result.message).toContain('temperatura');
  });
  it('rifiuta destinazioni, dati e gruppi non consentiti durante il riallineamento', () => {
    for (const calls of [[call('orienta_scenario', { scenario: 'fase-inventata', data: [] })], [call('orienta_scenario', { scenario: 'newborn', data: [{ field: 'unknown', value: true }] })], [call('orienta_scenario', { scenario: 'newborn', data: [] }), call('completa_step')]]) {
      expect(() => executeTools(context('preparation'), newDialogue(), calls, { id: 'invalid', text: 'Il neonato è già nato' })).toThrow();
    }
  });
  it('applica insieme i dati e l’ultima correzione, senza una transizione intermedia', () => {
    const result = executeTools(context('hr100'), newDialogue(), [call('aggiorna_osservazioni', { data: [{ field: 'hr', value: 50 }, { field: 'hr', value: 100 }] })], { id: 't', text: 'FC 50, anzi 100' });
    expect(result.observations.hr?.value).toBe(100); expect(result.action.next).toBe('post'); expect(result.message).toBe('');
  });
  it.each([60, 100])('include esattamente %s nel ramo maggiore o uguale', hr => {
    const result = executeTools(context(hr === 60 ? 'hr60' : 'hr100'), newDialogue(), [call('aggiorna_osservazioni', { data: [{ field: 'hr', value: hr }] })], { id: 't', text: `FC ${hr}` });
    expect(result.action.next).toBe(hr === 60 ? 'hr100' : 'post');
  });
  it('mantiene le soglie verbali e richiede la ventilazione efficace', () => {
    const d = newDialogue();
    const first = executeTools(context('hr60'), d, [call('aggiorna_osservazioni', { data: [{ field: 'hr', value: 'below60' }] })], { id: 't1', text: 'Sotto 60' });
    expect(first.action.next).toBeUndefined(); expect(first.question).toBe('effective');
    const second = executeTools(context('hr60'), d, [call('aggiorna_osservazioni', { data: [{ field: 'effective', value: true }] })], { id: 't2', text: 'Il team conferma ventilazione efficace' });
    expect(second.action.next).toBe('compressions'); expect(second.observations.hr?.value).toBe('below60');
  });
  it('torna ai correttivi con ventilazione inefficace', () => {
    expect(executeTools(context('hr60'), newDialogue(), [call('aggiorna_osservazioni', { data: [{ field: 'effective', value: false }] })], { id: 't', text: 'Ventilazione inefficace' }).action.next).toBe('correctives');
  });
  it.each(['Forse 50', 'Se fosse 50', 'FC 50?', 'Non so, forse 50'])('non conferma %s', text => {
    const result = executeTools(context('hr100'), newDialogue(), [call('aggiorna_osservazioni', { data: [{ field: 'hr', value: 50 }] })], { id: 't', text });
    expect(result.observations).toEqual({}); expect(result.action.next).toBeUndefined();
  });
  it('non completa o spunta interventi incerti', () => {
    const r = executeTools(context('preparation'), newDialogue(), [call('conferma_interventi', { checks: [0] }), call('completa_step')], { id: 't', text: 'Forse ho fatto tutto' });
    expect(r.action.intent).toBe('other'); expect(r.action.checks).toBeUndefined(); expect(r.action.next).toBeUndefined();
  });
  it('conferma interventi e avanzamento nello stesso turno senza farmaci impliciti', () => {
    const r = executeTools(context('medication'), newDialogue(), [call('conferma_interventi', { checks: [2] }), call('completa_step')], { id: 't', text: 'Rivalutazione DOPPES fatta, ho fatto tutto avanti' });
    expect(r.action.intent).toBe('complete'); expect(r.action.next).toBe('advanced-hr'); expect(r.action.checks).toEqual([2]);
  });
  it('consente soltanto eventi espliciti e blocca una negazione correttiva', () => {
    expect(executeTools(context('medication'), newDialogue(), [call('registra_evento', { event: 'medication' })], { id: 't', text: 'Adrenalina somministrata adesso' }).action.intent).toBe('medication');
    expect(executeTools(context('medication'), newDialogue(), [call('registra_evento', { event: 'medication' })], { id: 't', text: 'Adrenalina somministrata adesso, anzi no' }).action.intent).toBe('other');
  });
  it('rifiuta dati fuori intervallo o step e destinazioni inventate', () => {
    for (const args of [{ data: [{ field: 'hr', value: 400 }] }, { data: [{ field: 'term', value: true }] }, { data: [], next: 'compressions' }]) {
      expect(() => executeTools(context('hr100'), newDialogue(), [call('aggiorna_osservazioni', args)], { id: 't', text: 'Dato' })).toThrow();
    }
  });
  it('non applica di nuovo il turno con un altro ID di chiamata', () => {
    const d = newDialogue(); const c = context('preparation'); const turn = { id: 'same', text: 'Ho fatto tutto avanti' };
    executeTools(c, d, [call('completa_step')], turn);
    expect(() => executeTools(c, d, [call('completa_step', {}, 'new-id')], turn)).toThrow('già applicato');
  });
  it('accetta riferimenti ad altri step senza applicare dati', () => {
    const r = executeTools(context('preparation'), newDialogue(), [call('riferimenti_fonti', { sources: ['medication:overview'] })], { id: 't', text: 'Cosa succede dopo le compressioni?' });
    expect(r.sources).toEqual(['medication:overview']); expect(r.action.next).toBeUndefined(); expect(r.observations).toEqual({});
  });
  it('registra una dose esplicita e l’avanzamento insieme, una volta sola', () => {
    const session = { ...createSession(1), step: 'medication' as const };
    const c = contextOf(session);
    const result = executeTools(c, newDialogue(), [call('registra_evento', { event: 'medication' }), call('completa_step')], { id: 'dose-and-next', text: 'Adrenalina somministrata adesso, ho fatto tutto avanti' });
    const next = applyAuthorized(session, result.action, 5);
    expect(next.step).toBe('advanced-hr'); expect(next.lastMedicationAt).toBe(5);
    expect(next.events.filter(e => e.type === 'medication')).toHaveLength(1);
    expect(applyAuthorized(next, result.action, 6)).toBe(next);
  });

});

it.each(['Confermata la nascita', 'Confermo la nascita', 'Nascita confermata', 'Nascita avvenuta', 'Confermata la nascita, prosegui'])('accetta la conferma attuale senza parola adesso: %s', text => {
  const session = { ...createSession(1), step: 'birth' as const };
  const result = executeTools(contextOf(session), newDialogue(), [call('registra_evento', { event: 'birth' })], { id: text, text });
  expect(result.action.intent).toBe('birth');
  const next = applyAuthorized(session, result.action, 3);
  expect(next.step).toBe('cord');
  expect(next.birthAt).toBe(3);
});
it.each(['Non confermata la nascita', 'Confermata la nascita ieri', 'Forse nascita confermata', 'Confermata la nascita?', 'Nascita avvenuta alle 10'])('non registra una nascita negata, passata o incerta: %s', text => {
  const result = executeTools(context('birth'), newDialogue(), [call('registra_evento', { event: 'birth' })], { id: text, text });
  expect(result.action.intent).toBe('other');
});


it.each(['Il bambino è appena nato', 'Il neonato è nato ora', 'Confermata la nascita'])('dalla home registra subito la nascita e apre cord: %s', text => {
  const session = createSession(1);
  const result = executeTools(contextOf(session), newDialogue(), [call('registra_evento', { event: 'birth' })], { id: 'born-home', text });
  const next = applyAuthorized(session, result.action, 2);
  expect(next.step).toBe('cord'); expect(next.birthAt).toBe(2); expect(next.checks).toEqual({});
});
it('il completamento del cordone prevale sulla richiesta di conferma del modello', () => {
  const session = { ...createSession(1), step: 'cord' as const };
  const result = executeTools(contextOf(session), newDialogue(), [call('conferma_interventi', { checks: [0] })], { id: 'cord-complete', text: 'Ho attuato la gestione cordone ombelicale, vai avanti.' });
  expect(applyAuthorized(session, result.action, 2).step).toBe('initial'); expect(result.message).toBe('');
});

it.each(['first-actions', 'cord', 'post'] as const)('può orientare a una fase operativa della procedura: %s', step => {
  const session = createSession(1);
  const result = executeTools(contextOf(session), newDialogue(), [call('orienta_scenario', { scenario: step, data: [] })], { id: 'phase-' + step, text: 'Aggiornamento operativo corrente' });
  expect(applyAuthorized(session, result.action, 2).step).toBe(step);
});
it('accetta una parafrasi di nascita interpretata semanticamente senza elenco di frasi', () => {
  const session = createSession(1);
  const result = executeTools(contextOf(session), newDialogue(), [call('registra_evento', { event: 'birth' })], { id: 'semantic', text: 'La piccola è venuta al mondo in questo momento' });
  expect(applyAuthorized(session, result.action, 2).step).toBe('cord');
});

it('conserva il riscontro che motiva una fase operativa anche se non ha campi propri', () => {
  const session = { ...createSession(1), step: 'cord' as const };
  const result = executeTools(contextOf(session), newDialogue(), [call('orienta_scenario', { scenario: 'ppv', data: [{ field: 'hr', value: 'below60' }] })], { id: 'current-vital', text: 'Riscontro attuale comunicato dall’operatore' });
  const next = applyAuthorized(session, result.action, 2);
  expect(next.step).toBe('ppv'); expect(next.observations?.values.hr?.value).toBe('below60');
  expect(next.checks).toEqual({}); expect(next.lastMedicationAt).toBeNull();
});
