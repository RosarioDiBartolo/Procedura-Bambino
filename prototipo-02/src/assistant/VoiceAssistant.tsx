import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@nls/ui/components/button';
import { useSession } from '../SessionContext';
import { move, record, steps, type StepId } from '../flow';
import { procedurePath } from '../navigation';
import { canComplete, contextKey, contextOf, type Decision } from './protocol';
import { RealtimeClient, type VoiceState } from './realtime-client';
import { guidelinesFor } from './guidelines';
import './voice-assistant.css';

const labels: Record<VoiceState, string> = { off: 'Microfono spento', connecting: 'Connessione…', listening: 'In ascolto', analyzing: 'Valutazione del turno…', speaking: 'Voce in corso' };
export function VoiceAssistant({ onActive }: { onActive: (active: boolean) => void }) {
  const [session, setSession] = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VoiceState>('off');
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [latency, setLatency] = useState<number>();
  const [applying, setApplying] = useState(false);
  const client = useRef<RealtimeClient | null>(null);
  const revision = useRef(0);
  const current = useRef(session); current.current = session;
  const context = contextOf(session);
  const key = contextKey(context);
  const highlight = useRef<{ element: HTMLElement; timer: ReturnType<typeof setTimeout> } | null>(null);
  function clearHighlight() { if (highlight.current) { clearTimeout(highlight.current.timer); highlight.current.element.classList.remove('assistant-highlight'); highlight.current = null; } }
  function stop() { client.current?.stop(); client.current = null; }
  useEffect(() => { onActive(state !== 'off'); }, [state, onActive]);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    void fetch('/api/assistant/status', { signal: abort.signal }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setConfigured(d.configured)).catch(() => { if (!abort.signal.aborted) setError('Server vocale non disponibile. Avvia l’app con npm run dev dalla cartella principale.'); });
    return () => abort.abort();
  }, [open]);
  useEffect(() => {
    revision.current++; clearHighlight();
    client.current?.updateContext({ ...contextOf(current.current), revision: revision.current });
  }, [key]);
  useEffect(() => { stop(); return stop; }, [session.startedAt, session.finishedAt]);
  useEffect(() => {
    const end = () => stop(); window.addEventListener('pagehide', end);
    return () => { stop(); clearHighlight(); window.removeEventListener('pagehide', end); };
  }, []);
  function start() {
    stop(); setError(''); setLatency(undefined);
    const voice = new RealtimeClient({ ...contextOf(current.current), revision: revision.current }, update => {
      if (client.current !== voice) return;
      if (update.state) setState(update.state);
      if (update.error !== undefined) setError(update.error);
      if (update.transcript !== undefined) setTranscript(update.transcript);
      if (update.decision !== undefined) setDecision(update.decision);
      if (update.latency !== undefined) setLatency(update.latency);
    });
    client.current = voice; void voice.start();
  }
  async function action(accept: boolean) {
    const voice = client.current; if (!voice || applying) return;
    const before = contextKey(contextOf(current.current));
    setApplying(true); setError('');
    try {
      const result = await voice.action(accept);
      if (voice !== client.current || contextKey(contextOf(current.current)) !== before || !result.applied) return;
      if (result.action === 'complete_step') {
        const s = current.current; const next = steps[s.step].next;
        if (!canComplete(contextOf(s)) || result.targetId !== s.step || next !== result.next) throw new Error('Proposta non applicabile al passaggio corrente.');
        setSession(previous => contextKey(contextOf(previous)) === before ? move(previous, next!, Date.now(), 'Prosecuzione proposta dall’assistente e confermata sullo schermo') : previous);
        navigate(procedurePath(next as StepId), { replace: true });
      } else if (result.action === 'highlight') {
        const c = contextOf(current.current);
        if (!guidelinesFor(c.step).some(r => r.targetId === result.targetId)) throw new Error('Elemento non disponibile.');
        clearHighlight();
        const element = document.querySelector<HTMLElement>(`[data-assistant-target="${result.targetId}"]`);
        if (element) {
          element.classList.add('assistant-highlight'); element.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
          highlight.current = { element, timer: setTimeout(clearHighlight, 6000) };
          setSession(s => record(s, { at: Date.now(), step: s.step, type: 'action', text: 'Evidenziazione richiesta dall’assistente e confermata sullo schermo' }));
        }
      }
    } catch (e) { setDecision(null); setError(e instanceof Error ? e.message : 'Azione non disponibile.'); }
    finally { setApplying(false); }
  }
  const visible = decision && decision.type !== 'IGNORE' ? decision : null;
  return <>
    <Button variant={state === 'off' ? 'ghost' : 'default'} aria-expanded={open} aria-controls="ai-voice-panel" onClick={() => setOpen(v => !v)}>
      <span className={`assistant-dot ${state !== 'off' ? 'is-active' : ''}`} aria-hidden="true" />Assistente AI{state !== 'off' ? ' · attivo' : ''}
    </Button>
    {open && <section id="ai-voice-panel" className="ai-voice-panel" aria-label="Assistente AI in tempo reale">
      <div className="ai-voice-heading"><strong>Assistente AI</strong><Button variant="ghost" size="sm" onClick={() => { stop(); setOpen(false); }}>Chiudi e termina</Button></div>
      <p>Ascolta la conversazione e interviene nelle pause usando il passaggio attuale. Le azioni richiedono una conferma sullo schermo.</p>
      <p className="ai-voice-status" role="status"><span className={`assistant-dot ${state !== 'off' ? 'is-active' : ''}`} />{labels[state]}</p>
      {state === 'off' && <p className="ai-voice-note">Avviando invii l’audio e le trascrizioni a OpenAI. La voce è generata dall’AI. Usa solo scenari simulati, senza dati personali.</p>}
      {configured === false && <p className="ai-voice-note">Configura la chiave API nel file <code>prototipo-02/.env</code> e riavvia l’app. Le istruzioni sono nel README.</p>}
      <div className="ai-voice-controls">
        {state === 'off' ? <Button disabled={configured !== true || session.finishedAt !== null} onClick={start}>Avvia ascolto</Button> : <Button variant="outline" onClick={stop}>Disattiva microfono</Button>}
        <Button variant="outline" disabled={state !== 'speaking' && state !== 'analyzing'} onClick={() => client.current?.interrupt()}>Interrompi voce</Button>
      </div>
      {error && <p role="alert" className="ai-voice-error">{error}</p>}
      {transcript && <div className="ai-voice-transcript"><small>Ultima frase trascritta</small><p>{transcript}</p></div>}
      {visible && <div className="ai-voice-decision"><small>{visible.type === 'PROPOSE_ACTION' ? 'Proposta da confermare' : 'Ultimo intervento'}</small><p>{visible.message}</p><a href="/sources/poster-sin-2025.pdf" target="_blank" rel="noreferrer">{guidelinesFor(session.step).find(r => r.id === visible.guidelineId)?.source ?? 'Fonte della procedura'}</a>
        {visible.type === 'PROPOSE_ACTION' && <div className="ai-voice-controls"><Button disabled={applying} onClick={() => void action(true)}>{visible.action === 'highlight' ? 'Evidenzia' : 'Conferma e prosegui'}</Button><Button variant="ghost" disabled={applying} onClick={() => void action(false)}>Ignora</Button></div>}
      </div>}
      {latency !== undefined && <small className="ai-voice-metric">Fine turno → avvio audio: {(latency / 1000).toFixed(1)} s</small>}
    </section>}
  </>;
}
