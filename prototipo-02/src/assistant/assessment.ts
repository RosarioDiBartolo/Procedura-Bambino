import { decisionCases, steps, back, move, record, type Session, type StepId } from '../flow.ts';

export type Field = 'term' | 'tone' | 'breathing' | 'apnea' | 'hr' | 'difficulty' | 'cyanosis' | 'effective';
export type Value = boolean | number | 'below60' | 'atLeast60' | 'below100' | 'atLeast100' | null;
export type Observation = { value: Value; source: 'voice' | 'manual'; at: number };
export type Observations = Partial<Record<Field, Observation>>;
export const fields: Partial<Record<StepId, Field[]>> = {
  initial: ['term', 'tone', 'breathing'], respiration: ['apnea', 'hr'], distress: ['difficulty', 'cyanosis'],
  hr100: ['hr'], hr60: ['hr', 'effective'], 'advanced-hr': ['hr'],
};
export const questions: Record<Field, string> = {
  term: 'La gravidanza è a termine?', tone: 'Il tono è buono?', breathing: 'Il neonato respira o piange?',
  apnea: 'Sono presenti apnea o gasping?', hr: 'Qual è la frequenza cardiaca attuale?',
  difficulty: 'È presente respiro difficoltoso?', cyanosis: 'È presente cianosi persistente?', effective: 'Il team conferma che la ventilazione è efficace?',
};
export function visitOf(s: Session) { return `${s.startedAt}:${s.enteredAt}:${s.stack.length}:${s.step}`; }
export function cleanData(step: StepId, data: unknown): Partial<Record<Field, Value>> {
  const result: Partial<Record<Field, Value>> = {};
  if (!data || typeof data !== 'object') return result;
  for (const field of fields[step] ?? []) {
    const value = (data as Record<string, unknown>)[field];
    if (value === null || (field !== 'hr' && typeof value === 'boolean') ||
      (field === 'hr' && (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 350 || ['below60', 'atLeast60', 'below100', 'atLeast100'].includes(String(value))))) result[field] = value as Value;
  }
  return result;
}
/** Validate observations independently of the displayed phase so orientation cannot discard the evidence that motivated it. */
export function cleanObservedData(data: unknown): Partial<Record<Field, Value>> {
  return Object.assign({}, ...(['initial', 'respiration', 'distress', 'hr60'] as const).map(step => cleanData(step, data)));
}
export function assess(step: StepId, observations: Observations): { next?: StepId; missing: Field[] } {
  const v = (f: Field) => observations[f]?.value;
  const below = (n: 60 | 100): boolean | undefined => {
    const hr = v('hr');
    if (typeof hr === 'number') return hr < n;
    if (hr === `below${n}` || hr === 'below60') return true;
    if (hr === `atLeast${n}` || hr === 'atLeast100') return false;
    return undefined;
  };
  let choice: 'yes' | 'no' | undefined;
  if (step === 'initial') {
    const values = ['term', 'tone', 'breathing'].map(f => v(f as Field));
    if (values.includes(false)) choice = 'no'; else if (values.every(x => x === true)) choice = 'yes';
  } else if (step === 'respiration') {
    if (v('apnea') === true || below(100) === true) choice = 'yes';
    else if (v('apnea') === false && below(100) === false) choice = 'no';
  } else if (step === 'distress') {
    if (v('difficulty') === true || v('cyanosis') === true) choice = 'yes';
    else if (v('difficulty') === false && v('cyanosis') === false) choice = 'no';
  } else if (['hr100', 'hr60', 'advanced-hr'].includes(step)) {
    if (step === 'hr60' && v('effective') === false) return { next: 'correctives', missing: [] };
    const low = below(step === 'hr100' ? 100 : 60);
    if (low !== undefined && !(step === 'hr60' && low && v('effective') !== true)) choice = low ? 'yes' : 'no';
  }
  if (choice) return { next: decisionCases[step]?.find(c => c.id === choice)?.next, missing: [] };
  return { missing: (fields[step] ?? []).filter(f => f === 'hr' ? below(step === 'hr100' || step === 'respiration' ? 100 : 60) === undefined : typeof v(f) !== 'boolean') };
}
export const scenarioSteps = { ...Object.fromEntries(Object.keys(steps).map(id => [id, id])) as Record<StepId, StepId>, temperature: 'initial', newborn: 'initial', respiration: 'respiration', after_ventilation: 'hr100', after_correctives: 'hr60', after_compressions: 'advanced-hr' } as const;
export type Scenario = keyof typeof scenarioSteps;
export type Intent = 'orient' | 'question' | 'observe' | 'complete' | 'confirm_action' | 'back' | 'birth' | 'medication' | 'finish' | 'repeat' | 'other';
export type Authorized = { sessionKey: number; visit: string; turn: string; intent: Intent; orientation?: { scenario: Scenario; observations: Observations }; events?: 'medication'[]; next?: StepId; checks?: number[] };
export function applyAuthorized(s: Session, action: Authorized, now = Date.now()): Session {
  if (s.finishedAt !== null || action.sessionKey !== s.startedAt || action.visit !== visitOf(s) || s.appliedTurns?.includes(action.turn)) return s;
  let result: Session = { ...s, appliedTurns: [...(s.appliedTurns ?? []).slice(-199), action.turn] };
  if (action.intent === 'orient') {
    const orientation = action.orientation;
    if (!orientation || !Object.hasOwn(scenarioSteps, orientation.scenario)) return s;
    const target = scenarioSteps[orientation.scenario];
    const next = target === s.step ? result : move(result, target, now, 'Fase riallineata allo scenario attuale descritto dall’utente; nessun intervento pregresso dedotto');
    const values = cleanObservedData(Object.fromEntries(Object.entries(orientation.observations).map(([field, observation]) => [field, observation.value])));
    const aligned: Session = { ...next, observations: { visit: visitOf(next), values: Object.fromEntries(Object.entries(values).map(([field, value]) => [field, { value, source: 'voice', at: now }])) } };
    const branch = assess(target, aligned.observations!.values).next;
    return branch ? move(aligned, branch, now, 'Dati attuali già sufficienti: prosecuzione secondo le regole della procedura') : aligned;
  }
  if (action.intent === 'back') return back(result, now);
  if (action.intent === 'birth') return move(record({ ...result, birthAt: s.birthAt ?? now }, { at: now, step: s.step, type: 'birth', text: 'Nascita dichiarata esplicitamente adesso (voce)' }), 'cord', now, 'Gestione del cordone');
  if (action.intent === 'medication' && s.step === 'medication') return record({ ...result, lastMedicationAt: now }, { at: now, step: s.step, type: 'medication', text: 'Adrenalina somministrata adesso: dichiarazione esplicita (voce)' });
  if (action.intent === 'finish' && ['post', 'skin'].includes(s.step)) return record({ ...result, finishedAt: now }, { at: now, step: s.step, type: 'end', text: 'Conclusione esplicita (voce)' });
  if (action.events?.includes('medication') && s.step === 'medication') result = record({ ...result, lastMedicationAt: now }, { at: now, step: s.step, type: 'medication', text: 'Adrenalina somministrata adesso: dichiarazione esplicita (voce)' });
  for (const i of action.checks ?? []) if (steps[s.step].actions?.[i]) result = record({ ...result, checks: { ...result.checks, [`${s.step}-${i}`]: true } }, { at: now, step: s.step, type: 'action', text: `Intervento confermato (voce): ${steps[s.step].actions![i]}` });
  const allowed = new Set([steps[s.step].next, ...(decisionCases[s.step] ?? []).map(c => c.next), ...(s.step === 'hr60' ? ['correctives'] : []), ...(s.step === 'recovery-review' ? ['respiration'] : [])]);
  if (action.next && steps[s.step].kind === 'decision' && assess(s.step, s.observations?.visit === visitOf(s) ? s.observations.values : {}).next !== action.next) return result;
  if (action.next && allowed.has(action.next)) return move(result, action.next, now, 'Passaggio autorizzato dalle regole della procedura');
  if (action.intent === 'complete') return record(result, { at: now, step: s.step, type: 'action', text: 'Completamento complessivo dichiarato; nessuna somministrazione o intervento condizionale dedotto' });
  return result;
}
