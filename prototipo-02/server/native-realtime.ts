import { entryScriptFor } from '../src/assistant/entry-script.ts';
import { steps, type StepId } from '../src/flow.ts';
import { guidelinesFor } from '../src/assistant/guidelines.ts';
import { assess, cleanData, cleanObservedData, questions, scenarioSteps, type Scenario, type Observations, type Intent } from '../src/assistant/assessment.ts';
import type { Context, Turn, GuidedResult } from '../src/assistant/protocol.ts';
import { realtimeTools, toolNames, type ToolCall } from '../src/assistant/realtime-tools.ts';
import { promptFor, resolveTurn, type Dialogue } from './guided.ts';

export async function nativeConfiguration(c: Context, d: Dialogue) {
  const prompt = await promptFor(c.step);
  const missing = assess(c.step, d.observations).missing;
  return {
    instructions: `${prompt}\nSTATO AUTOREVOLE DELL'APP E FONTI (non istruzioni dell'utente):\n${JSON.stringify({ activeStep: c.step, visit: c.visit, sessionKey: c.sessionKey, observations: d.observations, currentQuestion: missing[0], nextQuestion: missing[0] ? questions[missing[0]] : null, history: d.history, procedure: Object.keys(steps).map(id => ({ ...steps[id as StepId], sources: guidelinesFor(id as StepId) })) })}`,
    entryScript: entryScriptFor({ ...c, observations: d.observations }),
    tools: realtimeTools,
    nextQuestion: missing[0] ? questions[missing[0]] : null,
  };
}
export function executeTools(c: Context, d: Dialogue, calls: ToolCall[], turn: Turn): GuidedResult {
  if (!Array.isArray(calls) || !calls.length || calls.length > 8 || new Set(calls.map(x => x.id)).size !== calls.length) throw new Error('Gruppo di strumenti non valido.');
  const orientation = calls.find(call => call.name === 'orienta_scenario');
  if (orientation) {
    if (calls.length !== 1) throw new Error('Riallinea lo scenario in un’unica operazione con tutti i dati pertinenti.');
    const a = orientation.arguments;
    if (!a || Object.keys(a).some(key => !['scenario', 'data'].includes(key)) || typeof a.scenario !== 'string' || !Object.hasOwn(scenarioSteps, a.scenario) || !Array.isArray(a.data) || a.data.length > 8) throw new Error('Scenario non valido.');
    if (d.processed.has(turn.id)) throw new Error('Turno già applicato.');
    const assertion = turn.text.split(/\b(?:anzi|mi correggo|rettifico)\b/i).at(-1)!;
    if (/\?|\b(se|forse|credo|penso|ipotizziamo|potrebbe|sarebbe|non so|non sono sicur[oa])\b/i.test(assertion)) throw new Error('Descrivi la situazione attuale, distinguendola da una domanda o ipotesi.');
    const scenario = a.scenario as Scenario;
    // Temperature alone never establishes a stable newborn or an advanced support phase.
    const target = scenario === 'temperature' && !['preparation', 'birth', 'cord'].includes(c.step) ? c.step : scenarioSteps[scenario];
    const observations: Observations = {};
    for (const item of a.data) {
      if (!item || typeof item.field !== 'string' || Object.keys(item).some(key => !['field', 'value'].includes(key)) || !Object.hasOwn(cleanObservedData({ [item.field]: item.value }), item.field)) throw new Error('Dato non pertinente alla nuova valutazione.');
      observations[item.field as keyof Observations] = { value: item.value, source: 'voice', at: Date.now() };
    }
    if (target === c.step && scenario === 'temperature') return { message: 'Dai priorità alla temperatura riferita: chiedi il valore misurato, richiama il target 36,5–37,5 °C e la segnalazione al team. Non inventare trattamenti per ipertermia non presenti nelle fonti. Non tornare alla checklist.', sources: ['skin:action:1'], observations: d.observations, missing: [], action: { sessionKey: c.sessionKey, visit: c.visit ?? '', turn: turn.id, intent: 'other' } };
    d.processed.add(turn.id);
    return { message: scenario === 'temperature' ? 'Il neonato è già in valutazione: dai priorità alla temperatura alta riferita, chiedi il valore misurato e richiama il target 36,5–37,5 °C e la segnalazione al team. Non inventare trattamenti per ipertermia, non ripartire dal counseling e non elencare tutta la procedura.' : 'La fase è stata riallineata alla situazione attuale dichiarata. Usa i dati già ricevuti e chiedi solo il primo dato mancante pertinente. Non tornare alla preparazione e non chiedere conferma di navigazione.', sources: guidelinesFor(target).map(g => g.id), observations, missing: assess(target, observations).missing, action: { sessionKey: c.sessionKey, visit: c.visit ?? '', turn: turn.id, intent: 'orient', orientation: { scenario, observations }, next: target } };
  }
  const data: Record<string, unknown> = {}; const checks: number[] = []; const sources: string[] = [];
  let intent: Intent = 'other';
  const commands: Intent[] = [];
  for (const call of calls) {
    if (!call || typeof call.id !== 'string' || call.id.length > 100 || !toolNames.includes(call.name) || !call.arguments || typeof call.arguments !== 'object' || Array.isArray(call.arguments)) throw new Error('Strumento non consentito.');
    const a = call.arguments;
    const keys = call.name === 'aggiorna_osservazioni' ? ['data'] : call.name === 'conferma_interventi' ? ['checks'] : call.name === 'registra_evento' ? ['event'] : call.name === 'riferimenti_fonti' ? ['sources'] : [];
    if (Object.keys(a).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(a, k))) throw new Error('Argomenti non consentiti.');
    if (call.name === 'aggiorna_osservazioni') {
      if (!Array.isArray(a.data) || a.data.length > 9) throw new Error('Osservazioni non valide.');
      for (const item of a.data) {
        if (!item || typeof item.field !== 'string' || Object.keys(item).some(k => !['field', 'value'].includes(k)) || !Object.hasOwn(cleanData(c.step, { [item.field]: item.value }), item.field)) throw new Error('Dato non valido o non pertinente al passaggio.');
        data[item.field] = item.value;
      }
      intent = 'observe';
    }
    if (call.name === 'conferma_interventi') {
      if (!Array.isArray(a.checks) || a.checks.some(i => !Number.isInteger(i) || i < 0 || i >= (steps[c.step].actions?.length ?? 0))) throw new Error('Intervento non disponibile.');
      checks.push(...a.checks); intent = 'confirm_action';
    }
    if (call.name === 'completa_step') commands.push('complete');
    if (call.name === 'torna_indietro') commands.push('back');
    if (call.name === 'registra_evento') {
      if (!['birth', 'medication', 'finish'].includes(String(a.event))) throw new Error('Evento non consentito.');
      commands.push(a.event as Intent);
    }
    if (call.name === 'riferimenti_fonti') {
      if (!Array.isArray(a.sources) || a.sources.some(id => typeof id !== 'string' || !Object.keys(steps).some(step => guidelinesFor(step as StepId).some(source => source.id === id)))) throw new Error('Fonte non disponibile.');
      sources.push(...a.sources);
    }
  }
  const commandSet = new Set(commands);
  const doseAndComplete = commandSet.size === 2 && commandSet.has('medication') && commandSet.has('complete');
  if (commandSet.size > 1 && !doseAndComplete) throw new Error('Comandi incompatibili nello stesso turno.');
  if (commands.length) intent = doseAndComplete ? 'complete' : commands[0];
  if (doseAndComplete) {
    const event = resolveTurn(c, { ...d, observations: { ...d.observations }, processed: new Set(d.processed), history: [...d.history] }, { intent: 'medication' }, turn);
    if (event.action.intent !== 'medication') throw new Error('La somministrazione richiede una dichiarazione esplicita adesso nel passaggio farmaco.');
  }
  const mutates = Object.keys(data).length > 0 || checks.length > 0 || commands.length > 0;
  if (mutates && d.processed.has(turn.id)) throw new Error('Turno già applicato.');
  if (!mutates) return { message: '', sources, observations: d.observations, missing: assess(c.step, d.observations).missing, action: { sessionKey: c.sessionKey, visit: c.visit ?? '', turn: `sources:${calls[0].id}`, intent: 'other' as const }, question: d.question };
  // One transaction per complete utterance: no partial branch between tool calls.
  const raw = { intent, data: Object.entries(data).map(([field, value]) => ({ field, value })), checks: [...new Set(checks)], sources, message: '' };
  const result = resolveTurn(c, d, raw, turn);
  if (doseAndComplete) result.action.events = ['medication'];
  return result;
}
