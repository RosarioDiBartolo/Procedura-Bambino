import TextType from '../components/ui/TextType';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../SessionContext';
import { record, type StepId } from '../flow';
import { sessionPath } from '../navigation';
import { applyAuthorized, assess, fields, questions, visitOf, type Field, type Value } from './assessment';

function Numeric({ value, commit }: { value?: Value; commit: (v: Value) => void }) {
  const [draft, setDraft] = useState(typeof value === 'number' ? String(value) : '');
  const [error, setError] = useState('');
  function save() {
    const n = draft === '' ? null : Number(draft);
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 350)) { setError('Inserisci un intero da 0 a 350.'); return; }
    setError(''); if (n !== value && !(n === null && value === undefined)) commit(n);
  }
  return <><input aria-label="Frequenza cardiaca in battiti al minuto" type="number" min="0" max="350" value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />{error && <small role="alert">{error}</small>}</>;
}
export function useAssessment(step: StepId) {
  const [session, setSession] = useSession();
  const navigate = useNavigate();
  const visit = visitOf(session);
  const observations = session.observations?.visit === visit ? session.observations.values : {};
  const evaluation = assess(step, observations);
  function commit(field: Field, value: Value) {
    if (session.step !== step || session.finishedAt !== null) return;
    const now = Date.now();
    const values = { ...observations, [field]: { value, source: 'manual' as const, at: now } };
    const result = assess(step, values);
    const updated = record({ ...session, observations: { visit, values } }, { at: now, step, type: 'assessment', text: `${questions[field]} ${value === null ? 'Sconosciuto' : value} (manuale)` });
    const next = result.next ? applyAuthorized(updated, { sessionKey: session.startedAt, visit, turn: `manual:${crypto.randomUUID()}`, intent: 'observe', next: result.next }, now) : updated;
    setSession(previous => visitOf(previous) === visit ? next : previous);
    if (next.step !== step) navigate(sessionPath(next), { replace: true });
  }
  return { observations, evaluation, visit, commit };
}
export function ObservationFields({ step }: { step: StepId }) {
  const { observations, evaluation, visit, commit } = useAssessment(step);
  if (!fields[step]) return null;
  return <section aria-label="Dati della valutazione" className="
      assessment-fields py-3 px-4 m-0 border border-solid border-[rgb(184,_200,_193)] rounded-[12px] grid
      grid-cols-[repeat(3,minmax(0,1fr))] gap-y-2.5 gap-x-5 shrink-0 [&>strong]:m-0 [&>strong]:[grid-column:1/-1]
      [&>strong]:text-[length:10px] [&>strong]:leading-[1.4] [&>p]:m-0 [&>p]:[grid-column:1/-1]
      [&>p]:text-[length:10px] [&>p]:leading-[1.5] [&>p]:[overflow-wrap:anywhere] max-[760px]:p-2.5
      max-[760px]:gap-2.5 max-[760px]:grid-cols-[repeat(auto-fit,minmax(110px,1fr))]
      [@media(min-width:761px)_and_(max-height:780px)]:py-2 [@media(min-width:761px)_and_(max-height:780px)]:px-3
      [@media(min-width:761px)_and_(max-height:780px)]:gap-y-1.5
      [@media(min-width:761px)_and_(max-height:780px)]:gap-x-4
      [&:not(:has(.assessment-field:nth-of-type(3)))]:grid-cols-[repeat(2,minmax(0,1fr))]
      [&:not(:has(.assessment-field:nth-of-type(2)))]:grid-cols-[minmax(0,1fr)]
    ">
    <strong><TextType text="Dati della valutazione" /></strong>
    {fields[step]!.map(field => {
      const observation = observations[field];
      return <div key={field} className="
      assessment-field p-0 gap-1.5 flex flex-wrap items-stretch grid-cols-[minmax(0,1fr)_auto] flex-col justify-start
      min-w-0 [&_label]:m-0 [&_label]:grow-0 [&_label]:shrink-0 [&_label]:basis-auto [&_label]:[grid-column:1/-1]
      [&_label]:text-[length:11px] [&_label]:leading-[1.4] [&_label]:block [&_label]:min-w-0 [&_input]:p-[5px]
      [&_input]:m-0 [&_input]:border [&_input]:border-solid [&_input]:border-[rgb(170,_185,_178)]
      [&_input]:rounded-[6px] [&_input]:w-full [&_input]:text-[length:11px] [&_input]:block [&_input]:grow-0
      [&_input]:shrink-0 [&_input]:basis-auto [&_input]:min-w-0 [&_input]:h-8 [&_input]:box-border [&_select]:p-[5px]
      [&_select]:m-0 [&_select]:border [&_select]:border-solid [&_select]:border-[rgb(170,_185,_178)]
      [&_select]:rounded-[6px] [&_select]:w-full [&_select]:text-[length:11px] [&_select]:block [&_select]:grow-0
      [&_select]:shrink-0 [&_select]:basis-auto [&_select]:min-w-0 [&_select]:h-8 [&_select]:box-border
      [&_small]:basis-auto [&_small]:text-[length:9px] [&_small]:leading-[1.4] [&_small]:block [&_small]:grow-0
      [&_small]:shrink-0 [&_small]:min-w-0 [&_small]:whitespace-normal [&_small]:[overflow-wrap:anywhere]
      max-[760px]:[&_select]:text-[length:10px] max-[760px]:[&_input]:text-[length:10px]
      [@media(min-width:761px)_and_(max-height:780px)]:gap-1
      [@media(min-width:761px)_and_(max-height:780px)]:[&_select]:h-7
      [@media(min-width:761px)_and_(max-height:780px)]:[&_input]:h-7
    "><label><TextType text={questions[field]} /></label>
        {field === 'hr' ? <Numeric key={`${visit}:${observation?.at ?? ''}`} value={observation?.value} commit={v => commit(field, v)} /> :
          <select aria-label={questions[field]} value={observation?.value === true ? 'yes' : observation?.value === false ? 'no' : ''} onChange={e => commit(field, e.target.value === '' ? null : e.target.value === 'yes')}>
            <option value="">Sconosciuto</option><option value="yes">Sì</option><option value="no">No</option>
          </select>}
        <small>{observation ? `${observation.value === null ? 'Sconosciuto' : String(observation.value)} · ${observation.source === 'voice' ? 'Voce' : 'Manuale'} · ${new Date(observation.at).toLocaleTimeString('it-IT')}` : 'Non ancora rilevato'}</small>
      </div>;
    })}
    <p role="status">{evaluation.missing.length ? `Dati mancanti: ${evaluation.missing.map(f => questions[f]).join(' ')}` : 'Dati sufficienti'}</p>
  </section>;
}
