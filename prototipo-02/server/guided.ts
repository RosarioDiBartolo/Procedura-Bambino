import { procedureVoice } from '../src/assistant/procedureVoice.ts';
import { readFile } from 'node:fs/promises';
import { steps, type StepId } from '../src/flow.ts';
import { guidelinesFor } from '../src/assistant/guidelines.ts';
import { assess, cleanData, questions, scenarioSteps, type Field, type Intent, type Observations, type Authorized } from '../src/assistant/assessment.ts';
import type { Context, Turn } from '../src/assistant/protocol.ts';
import { openai } from './provider.ts';

export type Dialogue = { observations: Observations; question?: Field; history: { user: string; assistant: string }[]; processed: Set<string> };
export const newDialogue = (): Dialogue => ({ observations: {}, history: [], processed: new Set() });
export async function promptFor(step: StepId) {
  const root = new URL('./prompts/', import.meta.url);
  const [general, local] = await Promise.all([readFile(new URL('general.md', root), 'utf8'), readFile(new URL(`steps/${step}.md`, root), 'utf8')]);
  return `${general}\n\n${local}`;
}
export function introduction(step: StepId) {
  return guidelinesFor(step).filter(r => r.id.endsWith(':overview') || r.id.includes(':detail:') || r.id.endsWith(':support')).map(r => r.text).join('\n');
}
export async function interpret(c: Context, turns: Turn[], signal?: AbortSignal, dialogue = newDialogue(), entry = false): Promise<unknown> {
  // Classification must not inherit the current page's narration instructions.
  const instructions = await readFile(new URL('./prompts/general.md', import.meta.url), 'utf8');
  const result = await openai('responses', {
    model: process.env.OPENAI_DECISION_MODEL || 'gpt-4.1-mini', store: false, max_output_tokens: 2500,
    instructions: `${instructions}\nQuesta chiamata decide operativamente prima del parlato. Restituisci il formato strutturato: intent è l’azione da applicare realmente, non una proposta raccontata nel message. Per riallineare usa intent orient e scenario; altrimenti scenario null. Compila event separatamente: se l’operatore dichiara un evento già avvenuto, event identifica quel fatto anche quando intent è orient. Non confondere l’evento avvenuto con la pagina che lo chiede: una pagina di conferma di un evento già dichiarato è superflua. Non descrivere uno spostamento senza autorizzarlo nel campo intent. message risponde soltanto se non serve cambiare fase.`,
    input: [{ role: 'user', content: JSON.stringify({
      communicationToInterpret: turns,
      task: 'Estrai prima tutti i riscontri esplicitamente comunicati, anche se non appartengono alla pagina aperta. Poi determina la fase pertinente nella procedura. La pagina non impone la fase. Non spiegare la vecchia fase quando il turno ne descrive un’altra. Non inventare valori, esecuzioni o prerequisiti. Per un riscontro in altra fase usa orient e conserva i dati in data. Se manca la storia del supporto, scegli la prima valutazione compatibile, senza supporre supporti già effettuati.',
      uiState: { displayedStep: c.step, entry, currentQuestion: dialogue.question, observations: dialogue.observations },
      recentHistory: dialogue.history.slice(-4),
      procedure: Object.values(steps).map(step => ({ ...step, fields: (Object.keys(questions) as Field[]).filter(field => Object.hasOwn(cleanData(step.id, { [field]: null }), field)), sources: guidelinesFor(step.id).filter(source => !source.id.includes(':detail:')) })),
    }) }],
    text: { format: { type: 'json_schema', name: 'procedure_dialogue', strict: true, schema: {
      type: 'object', additionalProperties: false, properties: {
        event: { description: 'Evento dichiarato realmente avvenuto ora nel contesto: indipendente dalla destinazione di navigazione. Null se nessun evento attuale, ipotesi o racconto passato.', anyOf: [{ type: 'string', enum: ['birth', 'medication', 'finish'] }, { type: 'null' }] },
        scenario: { anyOf: [{ type: 'string', enum: Object.keys(scenarioSteps) }, { type: 'null' }] },
        message: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } },
        intent: { type: 'string', enum: ['orient', 'question', 'observe', 'complete', 'confirm_action', 'back', 'birth', 'medication', 'finish', 'repeat', 'other'] },
        data: { description: 'Tutti i riscontri nuovi espliciti nel turno, indipendentemente dalla pagina. Nessuna deduzione clinica; preserva soglie verbali. Non inserire fatti non dichiarati.', type: 'array', items: { type: 'object', additionalProperties: false, properties: { field: { type: 'string', enum: Object.keys(questions) }, value: { anyOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'null' }, { type: 'string', enum: ['below60', 'atLeast60', 'below100', 'atLeast100'] }] } }, required: ['field', 'value'] } },
        checks: { type: 'array', items: { type: 'integer' } }, eventNow: { type: 'boolean' },
      }, required: ['message', 'sources', 'intent', 'event', 'scenario', 'data', 'checks', 'eventNow'],
    } } },
  }, signal);
  if (result.status !== 'completed') throw new Error('Risposta incompleta. Ripeti il turno.');
  return JSON.parse(result.output?.flatMap((o: any) => o.content ?? []).find((v: any) => v.type === 'output_text')?.text ?? '{}');
}
export function resolveTurn(c: Context, d: Dialogue, raw: any, turn: Turn, entry = false) {
  const validSources = new Set(Object.keys(steps).flatMap(id => guidelinesFor(id as StepId).map(r => r.id)));
  const sources = Array.isArray(raw?.sources) ? raw.sources.filter((id: unknown) => typeof id === 'string' && validSources.has(id)) : [];
  let intent: Intent = ['question', 'observe', 'complete', 'confirm_action', 'back', 'birth', 'medication', 'finish', 'repeat', 'other'].includes(raw?.intent) ? raw.intent : 'other';
  if (entry) intent = 'repeat';
  // A question, hypothetical or uncertain utterance never commits observations.
  const assertion = turn.text.split(/\b(?:anzi|mi correggo|rettifico)\b/i).at(-1)!;
  const uncertain = /\?|\b(se|forse|credo|penso|ipotizziamo|potrebbe|sarebbe|non so|non sono sicur[oa])\b/i.test(assertion);
  const actions = steps[c.step].actions ?? [];
  if (!entry && !uncertain && intent === 'confirm_action' && c.step !== 'medication' && actions.length && actions.every((_, index) => raw.checks?.includes(index))) intent = 'complete';
  const data = !entry && !uncertain && ['observe', 'complete', 'confirm_action'].includes(intent)
    ? cleanData(c.step, Object.fromEntries((Array.isArray(raw?.data) ? raw.data : []).map((x: any) => [x.field, x.value]))) : {};
  const now = Date.now();
  for (const [field, value] of Object.entries(data)) d.observations[field as Field] = { value, source: 'voice', at: now };
  const assessment = assess(c.step, d.observations);
  const action: Authorized = { sessionKey: c.sessionKey, visit: c.visit ?? '', turn: turn.id, intent };
  if (!entry && !uncertain && intent !== 'question') action.next = assessment.next;
  if (!entry && !uncertain && intent === 'complete' && steps[c.step].kind === 'action') action.next = steps[c.step].next ?? (c.step === 'recovery-review' ? 'respiration' : undefined);
  if (!entry && !uncertain && ['confirm_action', 'observe', 'complete'].includes(intent)) action.checks = (raw.checks ?? []).filter((i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < (steps[c.step].actions?.length ?? 0));
  let message = typeof raw?.message === 'string' && sources.length ? raw.message.slice(0, 14000) : intent === 'question' ? 'Le fonti del progetto non contengono una risposta a questa domanda.' : '';
  if (action.checks?.length && !message) message = 'Intervento registrato nello scenario.';
  if (entry && !sources.length) { message = introduction(c.step); sources.push(...guidelinesFor(c.step).map(r => r.id)); }
  if (['birth', 'medication', 'finish', 'back'].includes(intent)) {
    const explicit = !uncertain && ({ birth: /^(?!.*\b(?:non|ieri|precedente|passat[oa]|fa|minuti|ore|alle|stamattina|domani|confermare|confermi)\b).+$/i, medication: /\badrenalina\b.*\bsomministrata\b.*\b(adesso|ora)\b/i, finish: /\b(concludi|termina)\b.*\bsimulazione\b/i, back: /\b(torna|torniamo)\b.*\bindietro\b/i }[intent as 'birth'] as RegExp).test(assertion);
    const available = intent === 'back' || intent === 'birth' && !c.finished || intent === 'medication' && c.step === 'medication' || intent === 'finish' && ['post', 'skin'].includes(c.step);
    if (!explicit || !available) { action.intent = 'other'; message = !explicit ? 'Chiarisci il comando e, per un evento, se è avvenuto adesso.' : 'Questo comando non è disponibile nel passaggio attuale.'; }
    else message = '';
  }
  if (uncertain && !['question', 'repeat', 'other'].includes(action.intent)) { action.intent = 'other'; action.next = undefined; action.checks = undefined; }
  d.question = assessment.missing[0];
  if (!action.next && !['question', 'back', 'birth', 'medication', 'finish'].includes(intent) && d.question) message = entry ? `${message}\n${questions[d.question]}` : questions[d.question];
  if (action.next) message = ''; // The next step introduces itself; no branch recap or confirmation.
  message = procedureVoice(message);
  d.history = [...d.history, { user: turn.text, assistant: message }].slice(-8);
  d.processed.add(turn.id);
  return { message, sources, observations: d.observations, missing: assessment.missing, action, question: d.question };
}
