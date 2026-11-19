import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { isPlayground } from './playground/mode';
import { SimulatedClient } from './playground/simulated-client';
import { Playground } from './playground/Playground';
import { ArrowRight, Mic, Keyboard, Square, RotateCcw, Power, Send, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Conversation, useConversation } from './Conversation';
import { AgentOrb } from '../components/agents/agent-orb';
import { OrbFlight } from '../components/agents/orb-flight';
import { AIVoiceInput } from '../components/ui/ai-voice-input';
import LatticeLoader from '../components/ui/lattice-loader';

import { applyAuthorized, visitOf } from './assessment';

import { sessionPath } from '../navigation';

import { startTransition, useEffect, useId, useRef, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@nls/ui/components/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@nls/ui/components/dialog';

import { useSession } from '../SessionContext';

import { move, record, steps, type StepId } from '../flow';

import { procedurePath } from '../navigation';

import { canComplete, contextKey, contextOf, type Decision } from './protocol';

import { RealtimeClient, type VoiceState } from './realtime-client';

import { guidelinesFor } from './guidelines';




const labels: Record<VoiceState, string> = { off: 'Assistente disattivato', connecting: 'Connessione…', listening: 'Assistente pronto', analyzing: 'Valutazione del turno…', speaking: 'Voce in corso' };

export const welcome = 'Ciao, sono il tuo assistente Nido. Ti accompagno nella simulazione della procedura neonatale, un passaggio alla volta. Puoi parlarmi direttamente e descrivermi a che punto sei, oppure consultare le schede sullo schermo. Iniziamo dalla preparazione?';

export function VoiceAssistant({ home = false, onFocus, onActive, dockTarget, conversationTarget }: { conversationTarget?: HTMLElement | null; dockTarget?: HTMLElement | null; home?: boolean; onFocus?: (focused: boolean) => void; onActive?: (active: boolean) => void } = {}) {

  const [session, setSession] = useSession();
  const layoutScope = useId();
  const reducedMotion = useReducedMotion();
  const layoutTransition = reducedMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 290, damping: 30 };
  const conversation = useConversation();
  const conversationRef = useRef(conversation); conversationRef.current = conversation;
  const newResponse = useRef(true);
  const pendingReplay = useRef<string | null>(null);
  const previousHome = useRef(home);
  useEffect(() => {
    if (previousHome.current && !home && current.current.step === 'preparation') void client.current?.enterStep();
    previousHome.current = home;
  }, [home]);

  const navigate = useNavigate();
  const location = useLocation();
  const route = useRef(location.pathname); route.current = location.pathname;

  const [open, setOpen] = useState(false);
  const [orbSource, setOrbSource] = useState<HTMLSpanElement | null>(null);
  const [orbDestination, setOrbDestination] = useState<HTMLSpanElement | null>(null);
  const [draft, setDraft] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [submitting, setSubmitting] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);
  useEffect(() => { if (!interrupted) return; const timer = setTimeout(() => setInterrupted(false), 1400); return () => clearTimeout(timer); }, [interrupted]);

  const [state, setState] = useState<VoiceState>('off');

  const [userSpeaking, setUserSpeaking] = useState(false);

  const [microphone, setMicrophone] = useState(false);

  const autoStarted = useRef<number | null>(null);

  const [error, setError] = useState('');

  const [configured, setConfigured] = useState<boolean | null>(null);







  const [decision, setDecision] = useState<Decision | null>(null);

  const [latency, setLatency] = useState<number>();

  const [applying, setApplying] = useState(false);

  const client = useRef<RealtimeClient | SimulatedClient | null>(null);

  const revision = useRef(0);

  const syncedKey = useRef('');

  const current = useRef(session); current.current = session;

  const context = contextOf(session);

  const key = contextKey(context);

  const highlight = useRef<{ element: HTMLElement; timer: ReturnType<typeof setTimeout> } | null>(null);

  function clearHighlight() { if (highlight.current) { clearTimeout(highlight.current.timer); highlight.current.element.classList.remove('assistant-highlight'); highlight.current = null; } }

  function stop() { client.current?.stop(); client.current = null; }

  function disableVoice() {
    pendingReplay.current = null;
    client.current?.interrupt();
    current.current = { ...current.current, voiceDisabled: true };
    stop(); clearHighlight(); setInputMode('text'); setSubmitting(false); setInterrupted(false); setOpen(false); setState('off'); setMicrophone(false); setUserSpeaking(false); setDecision(null); setError('');
    setSession(previous => ({ ...previous, voiceDisabled: true }));
  }

  function reactivate(listen: boolean) {
    current.current = { ...current.current, voiceDisabled: false };
    autoStarted.current = current.current.startedAt;
    setSession(previous => ({ ...previous, voiceDisabled: false }));
    return start(listen);
  }

  useEffect(() => { onFocus?.(userSpeaking); }, [userSpeaking, onFocus]);

  useEffect(() => { onActive?.(state !== 'off'); }, [state, onActive]);

  useEffect(() => {

    if (session.voiceDisabled) return;
    if (isPlayground()) { setConfigured(true); return; }
    const abort = new AbortController();

    void fetch('/api/assistant/status', { signal: abort.signal }).then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => setConfigured(d.configured)).catch(() => { if (!abort.signal.aborted) setError('Server vocale non disponibile. Avvia l’app con npm run dev dalla cartella principale.'); });

    return () => abort.abort();

  }, [session.voiceDisabled]);

  useEffect(() => {

    if (syncedKey.current === key) return;

    syncedKey.current = key;

    if (pendingReplay.current !== visitOf(current.current)) pendingReplay.current = null;
    revision.current++; clearHighlight();

    client.current?.updateContext({ ...contextOf(current.current), revision: revision.current });

  }, [key]);

  useEffect(() => { pendingReplay.current = null; stop(); return stop; }, [session.startedAt, session.finishedAt]);

  useEffect(() => {

    const end = () => stop(); window.addEventListener('pagehide', end);

    return () => { stop(); clearHighlight(); window.removeEventListener('pagehide', end); };

  }, []);

  function start(listen = true) {
    if (current.current.voiceDisabled) return;

    stop(); setError(''); setLatency(undefined);

    const Client = isPlayground() ? SimulatedClient : RealtimeClient;
    const voice = new Client({ ...contextOf(current.current), revision: revision.current }, update => {

      if (client.current !== voice || current.current.voiceDisabled) return;

      if (update.state) { setState(update.state); if (update.state !== 'connecting') setSubmitting(false); }
      if (update.interrupted === false || update.state === 'analyzing' || update.state === 'speaking' || update.userSpeaking === true) setInterrupted(false);
      if (update.inputAnalyser !== undefined) setInputAnalyser(update.inputAnalyser);
      if (update.outputAnalyser !== undefined) setOutputAnalyser(update.outputAnalyser);
      if (update.error || update.state === 'off' || update.userSpeaking) pendingReplay.current = null;
      if (update.replayVisit) pendingReplay.current = update.replayVisit;
      if (update.narrationVisit && update.narrationVisit === pendingReplay.current && update.narrationVisit === visitOf(current.current)) {
        pendingReplay.current = null;
        conversationRef.current.replayStep(update.narrationVisit);
      }

      if (update.userSpeaking !== undefined) setUserSpeaking(update.userSpeaking);

      if (update.state === 'off') client.current = null;

      if (update.microphone !== undefined) setMicrophone(update.microphone);

      if (update.error !== undefined) setError(update.error);

      if (update.transcript !== undefined) { if (update.transcript) conversationRef.current.update('user', update.transcript); }

      if (update.decision !== undefined) setDecision(update.decision);
      if (update.interrupted) { setInterrupted(true); const last = conversationRef.current.messages.at(-1); if (last?.role === 'assistant') conversationRef.current.update('assistant', last.text, false, true); }

      if (update.latency !== undefined) setLatency(update.latency);

      if (update.assistantTranscript !== undefined) {

        if (!update.assistantTranscript) newResponse.current = true;
        else {
          const repeatedIntroduction = home && welcome.startsWith(update.assistantTranscript) && conversationRef.current.messages.some(message => message.role === 'assistant' && message.text === welcome);
          if (!repeatedIntroduction) conversationRef.current.update('assistant', update.assistantTranscript, newResponse.current);
          newResponse.current = false;
        }
      }



      if (update.guided) {

        const g = update.guided;

        const s = current.current;

        if (g.action.visit !== visitOf(s) || g.action.sessionKey !== s.startedAt) return;

        const withData = { ...s, observations: { visit: visitOf(s), values: g.observations } };

        const updated = Object.keys(g.observations).length && ['observe', 'complete', 'confirm_action'].includes(g.action.intent) ? record(withData, { at: Date.now(), step: s.step, type: 'assessment', text: `Dati vocali riconosciuti: ${JSON.stringify(g.observations)}` }) : withData;

        const at = Date.now();

        const next = applyAuthorized(updated, g.action, at);

        current.current = next;

        const nextKey = contextKey(contextOf(next));

        if (nextKey !== syncedKey.current) {

          syncedKey.current = nextKey;

          voice.updateContext({ ...contextOf(next), revision: ++revision.current });

        }

        startTransition(() => {
          setSession(previous => visitOf(previous) === g.action.visit && previous.startedAt === g.action.sessionKey ? applyAuthorized({ ...previous, observations: withData.observations, events: updated.events }, g.action, at) : previous);
          const operational = ['orient', 'birth', 'complete'].includes(g.action.intent);
          if (next.step !== s.step || next.finishedAt !== s.finishedAt || operational && route.current !== sessionPath(next)) navigate(sessionPath(next), { replace: true });
        });

      }



    }, home ? welcome : undefined);

    client.current = voice; void voice.start(listen); return voice;

  }

  useEffect(() => {

    if (session.voiceDisabled || configured !== true || session.finishedAt !== null || autoStarted.current === session.startedAt) return;

    autoStarted.current = session.startedAt;

    start(false);

  }, [home, configured, session.startedAt, session.finishedAt, session.voiceDisabled]);

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

  function stopResponse() {
    pendingReplay.current = null;
    if (state === 'connecting') { stop(); setState('off'); setMicrophone(false); }
    else client.current?.interrupt();
    setSubmitting(false); setInterrupted(true);
  }

  function enableListening() {
    setInputMode('voice'); setInterrupted(false); setOpen(false);
    if (client.current) void client.current.enableMicrophone();
    else reactivate(true);
  }

  function selectText() {
    setInputMode('text');
    client.current?.disableMicrophone();
  }

  function submitText() {
    const text = draft.trim();
    if (!text || busy || session.finishedAt !== null) return;
    pendingReplay.current = null;
    setOpen(false); setDraft(''); setInterrupted(false); setSubmitting(true);
    const voice = client.current ?? reactivate(false);
    voice?.sendText(text);
    conversationRef.current.update('user', text, true);
  }

  function repeatStep() {
    setOpen(false); setInterrupted(false); setError('');
    pendingReplay.current = visitOf(current.current);
    if (home) { reactivate(false); return; }
    if (client.current && !current.current.voiceDisabled) {
      setState('analyzing');
      void client.current.enterStep({ ...contextOf(current.current), revision: ++revision.current });
    } else reactivate(false);
  }

  const busy = submitting || state === 'connecting' || state === 'analyzing' || state === 'speaking';
  const finished = session.finishedAt !== null;
  const thinking = (submitting || state === 'analyzing') && !interrupted && !error && !session.voiceDisabled && !finished;
  const statusText = interrupted ? 'Risposta interrotta' : session.voiceDisabled ? 'Voce disattivata per questa sessione'
    : error ? 'Collegamento non disponibile' : (userSpeaking ? 'Ti ascolto' : microphone ? 'Ascolto continuo attivo' : labels[state]);

  const composer = <div className="mx-auto w-full min-w-0 max-w-xl space-y-3" data-agent-composer>
    <div className="flex items-center justify-between gap-2">
      <div className="inline-flex shrink-0 rounded-lg bg-muted p-1" role="group" aria-label="Modalità di input">
        <button type="button" aria-pressed={inputMode === 'text'} onClick={selectText}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${inputMode === 'text' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Keyboard className="size-3.5 shrink-0" />Scrivi
        </button>
        <button type="button" aria-label={inputMode === 'voice' ? 'Modalità microfono' : 'Attiva microfono'} aria-pressed={inputMode === 'voice'}
          disabled={finished || state === 'connecting'} onClick={enableListening}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${inputMode === 'voice' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Mic className="size-3.5 shrink-0" />Microfono
        </button>
      </div>
      <span className="min-w-0 flex-1 truncate text-right text-[10px] text-muted-foreground" role="status" title={statusText}>{statusText}</span>
    </div>

    {inputMode === 'text' ? <form className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm focus-within:border-ring"
      aria-label="Scrivi a Nido" onSubmit={event => { event.preventDefault(); if (!busy) submitText(); }}>
      <textarea className="
      min-h-16 max-h-36 min-w-0 flex-1 resize-y bg-transparent p-2 text-[13px] leading-relaxed text-foreground
      outline-none placeholder:text-muted-foreground disabled:opacity-50
    "
        aria-label="Messaggio a Nido" placeholder="Scrivi a Nido…" rows={2} maxLength={2000} value={draft} disabled={finished}
        onChange={event => setDraft(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy) submitText(); }
        }} />
      {busy ? <Button className="size-10 shrink-0 rounded-xl bg-primary text-primary-foreground" type="button"
        aria-label="Interrompi risposta" title="Interrompi risposta" onClick={stopResponse}><Square className="size-4 fill-current" /></Button>
        : <Button className="size-10 shrink-0 rounded-xl" type="submit" aria-label="Invia messaggio" title="Invia messaggio"
          disabled={!draft.trim() || finished}><Send className="size-4" /></Button>}
    </form> : <div className="rounded-2xl border border-input bg-card px-3">
      <AIVoiceInput recording={microphone} analyser={inputAnalyser} connecting={state === 'connecting'} disabled={finished}
        onStart={enableListening} onStop={() => client.current?.disableMicrophone()} />
    </div>}

    <div className="flex flex-wrap items-center justify-between gap-1" role="group" aria-label="Controlli vocali">
      <Button variant="ghost" className="h-8 gap-1.5 px-2 text-[10px] text-muted-foreground" aria-label="Rispiega questo step"
        title="Rispiega questo step" disabled={state === 'connecting' || finished || (configured !== true && !session.voiceDisabled)}
        onClick={repeatStep}>
        <RotateCcw className="size-3.5" /><span>Rispiega</span>
      </Button>
      {inputMode === 'voice' && busy && <Button variant="ghost" className="h-8 gap-1.5 px-2 text-[10px]" aria-label="Interrompi risposta" onClick={stopResponse}>
        <Square className="size-3.5" /><span>Interrompi</span>
      </Button>}
      <Button variant="ghost" className="h-8 gap-1.5 px-2 text-[10px] text-muted-foreground"
        aria-label={session.voiceDisabled ? 'Riattiva assistente vocale' : 'Disattiva assistente vocale per la sessione'}
        aria-pressed={!!session.voiceDisabled} disabled={finished}
        onClick={() => { setOpen(false); if (session.voiceDisabled) enableListening(); else disableVoice(); }}>
        <Power className="size-3.5" /><span>{session.voiceDisabled ? 'Riattiva voce' : 'Disattiva voce'}</span>
      </Button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">{error}</p>}
  </div>;

  const visible = decision && decision.type !== 'IGNORE' ? decision : null;
  const docked = !!dockTarget;
  const orb = <AgentOrb state={state} userSpeaking={userSpeaking} microphone={microphone} error={error} interrupted={interrupted}
    inputAnalyser={inputAnalyser} outputAnalyser={outputAnalyser}
    className="size-full" />;
  const stage = <motion.section layout={!docked} layoutId={docked ? undefined : 'nido-stage'} transition={layoutTransition}
    className={docked
      ? `
      assistant-stage in-sidebar is-docked relative grid w-full grid-cols-[76px_minmax(0,1fr)]
      [@media(max-height:700px)]:grid-cols-[56px_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 text-left
      [.minimal-sidebar.is-collapsed_&]:flex [.minimal-sidebar.is-collapsed_&]:justify-center
    `
      : `
      assistant-stage is-centered fixed left-1/2 top-1/2 z-[46] flex max-h-[calc(100dvh-150px)] w-[min(580px,92vw)]
      -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 overflow-y-auto p-3 text-center
    `}
    aria-label="Guida della procedura">
    {home ? <div role="img" aria-label={userSpeaking ? 'Nido in ascolto' : state === 'speaking' ? 'Nido sta parlando' : 'Nido in attesa'}><span ref={setOrbSource} className="block size-36 sm:size-44" /></div>
      : <button type="button" className="orbit-toggle row-span-2 grid min-w-0 max-w-full place-items-center self-center justify-self-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
        aria-label="Comandi e impostazioni di Nido" aria-expanded={open} aria-controls="ai-voice-panel" onClick={() => setOpen(value => !value)}><span ref={setOrbSource} aria-hidden="true" className="block size-[76px] [.minimal-sidebar.is-collapsed_&]:size-11 [@media(max-height:700px)]:size-14" /></button>}
    {docked && <strong className="assistant-name min-w-0 self-end text-[17px] text-foreground [.minimal-sidebar.is-collapsed_&]:hidden">Nido
      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">Assistente di procedura</span></strong>}
    <small className={docked ? 'col-start-2 self-start text-[10px] text-muted-foreground [.minimal-sidebar.is-collapsed_&]:hidden' : 'text-[10px] tracking-wider text-muted-foreground'}>
      {thinking ? <LatticeLoader label="Sto pensando" fontSize={11} cellSize={4} gap={2} showTimer={false} />
        : home ? 'NIDO · ASSISTENTE DI PROCEDURA' : statusText}
    </small>
    {home && <><Conversation compact emptyText={welcome} />{composer}
      <Button className="min-h-12 gap-4 rounded-xl px-5" onClick={() => navigate(sessionPath(session))}>
        {session.step === 'preparation' ? 'Inizia dalla preparazione' : 'Riprendi la procedura'}<ArrowRight className="size-5" />
      </Button></>}
  </motion.section>;

  return <LayoutGroup id={layoutScope}>
    {orbSource && <OrbFlight source={orbSource} destination={orbDestination} open={open}>{orb}</OrbFlight>}
    {isPlayground() && <Playground />}
    {!home && (conversationTarget ? createPortal(composer, conversationTarget) : composer)}
    {docked ? createPortal(stage, dockTarget!) : stage}
    <Dialog open={!home && open} onOpenChange={setOpen}>
      <DialogContent id="ai-voice-panel" showCloseButton={false} className="max-h-[80dvh] overflow-auto rounded-2xl bg-card text-[13px] leading-relaxed data-[state=open]:animate-dialog-overlay-in data-[state=closed]:animate-dialog-overlay-out">
          <div className="flex items-center gap-4 pr-8"><span ref={setOrbDestination} aria-hidden="true" className="block size-24 shrink-0 min-[380px]:size-32 sm:size-40" /><DialogTitle className="min-w-0">Assistente Nido</DialogTitle><Button variant="ghost" size="sm"
            className="absolute top-4 right-4" aria-label="Chiudi impostazioni assistente" onClick={() => setOpen(false)}><X className="size-5" /></Button></div>
          <DialogDescription>Ti accompagno nel passaggio attuale. Puoi scrivere o attivare l’ascolto continuo nella conversazione.</DialogDescription>
          {thinking ? <LatticeLoader label="Sto pensando" fontSize={13} cellSize={5} showTimer={false} className="text-muted-foreground" />
            : <p role="status" className="text-muted-foreground">{statusText}</p>}
          {state === 'off' && <p className="my-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">Avviando invii l’audio e le trascrizioni a OpenAI. La voce è generata dall’AI. Usa solo scenari simulati, senza dati personali.</p>}
          {configured === false && <p className="my-3 text-muted-foreground">La voce non è ancora configurata. Puoi seguire la procedura sullo schermo.</p>}
          {visible && <div className="mt-4 space-y-2 border-t border-border pt-3"><small className="text-muted-foreground">{visible.type === 'PROPOSE_ACTION' ? 'Proposta da confermare' : 'Ultimo intervento'}</small>
            <p>{visible.message || 'Nessuna risposta vocale prevista'}</p><a className="text-xs underline" href="/sources/poster-sin-2025.pdf" target="_blank" rel="noreferrer">
              {guidelinesFor(session.step).find(r => r.id === visible.guidelineId)?.source ?? 'Fonte della procedura'}</a>
            {visible.type === 'PROPOSE_ACTION' && <div className="flex flex-wrap gap-2"><Button disabled={applying} onClick={() => { void action(true); setOpen(false); }}>
              {visible.action === 'highlight' ? 'Evidenzia' : 'Conferma e prosegui'}</Button><Button variant="ghost" disabled={applying} onClick={() => { void action(false); setOpen(false); }}>Ignora</Button></div>}
          </div>}
          {latency !== undefined && <small className="mt-3 block tabular-nums text-muted-foreground">Fine turno → avvio audio: {(latency / 1000).toFixed(1)} s</small>}
      </DialogContent>
    </Dialog>
  </LayoutGroup>;
}

