import { italianVoiceInstructions } from './voice-policy';
import { entryScriptFor } from './entry-script';
import type { ToolCall } from './realtime-tools';
import { ConversationController } from './conversation-controller';
import type { Context, Decision, GuidedResult } from './protocol';

export type VoiceState = 'off' | 'connecting' | 'listening' | 'analyzing' | 'speaking';
export type VoiceUpdate = { inputAnalyser?: AnalyserNode | null; outputAnalyser?: AnalyserNode | null; replayVisit?: string; narrationVisit?: string; userSpeaking?: boolean; microphone?: boolean; state?: VoiceState; error?: string; transcript?: string; decision?: Decision | null; latency?: number; guided?: GuidedResult; assistantTranscript?: string; interrupted?: boolean };
export class RealtimeClient {
  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private stream?: MediaStream;
  private sender?: RTCRtpSender;
  private microphoneRequest = false;
  private microphoneRevision = 0;
  private audio = new Audio();
  private meterContext?: AudioContext;
  private inputMeter?: MediaStreamAudioSourceNode;
  private outputMeter?: MediaStreamAudioSourceNode;
  private token?: string;
  private lifecycle = new AbortController();
  private controller: ConversationController;
  private contextSync: Promise<unknown> = Promise.resolve();
  private responseActive = false;
  private requestId?: string;
  private responseId?: string;
  private playing = false;
  private outputFinished = false;
  private inputRevisions = new Map<string, number>();
  private interaction = 0;
  private closed = false;
  private connected = false;
  private turnEndedAt = 0;
  private watchdog?: ReturnType<typeof setTimeout>;
  private expiry?: ReturnType<typeof setTimeout>;
  private sequence = 0;
  private processedInputs = new Set<string>();
  private responseMode: 'entry' | 'tools' | 'answer' = 'entry';
  private latestTurn?: { id: string; text: string };
  private responseTurn?: { id: string; text: string };
  private completedResponses = new Set<string>();
  private toolRequest?: AbortController;
  private applyingTools = false;
  private citedSources: string[] = [];
  private loggedResponses = new Set<string>();
  private narratedResponses = new Set<string>();
  private spokenTranscript = "";
  private pending?: { id: string; revision: number };
  private greetingPending = true;
  private pendingText?: string;
  constructor(private context: Context, private update: (value: VoiceUpdate) => void, private greeting?: string) {
    this.controller = new ConversationController(context, async (c, turns, _sequence, signal) => {
      await this.contextSync;
      const fresh = turns.filter(t => !this.processedInputs.has(t.id));
      if (!fresh.length) return { type: 'IGNORE' };
      const turn = { id: fresh.at(-1)!.id, text: fresh.map(t => t.text).join('\n').slice(-2000) };
      const registered = await this.api('utterance', { revision: c.revision, visit: c.visit, sessionKey: c.sessionKey, turn }, signal);
      if (signal.aborted) return { type: 'IGNORE' };
      this.latestTurn = turn;
      if (registered.guided) {
        fresh.forEach(t => this.processedInputs.add(t.id));
        const before = this.context;
        this.applyingTools = true;
        try { this.update({ guided: registered.guided }); await this.contextSync; }
        finally { this.applyingTools = false; }
        if (this.closed) return { type: 'IGNORE' };
        if (registered.guided.action.intent === 'repeat') this.update({ replayVisit: this.context.visit });
        if (this.context.visit !== before.visit || ['orient', 'repeat'].includes(registered.guided.action.intent)) await this.enterStep();
        else await this.respond('answer', `Stato applicato dall’app: ${JSON.stringify({ step: this.context.step, action: registered.guided.action.intent, question: registered.guided.question, observations: registered.guided.observations, userText: turn.text, directive: registered.guided.message })}. Usa come comunicazione corrente soltanto userText, senza reinterpretare audio precedente né cambiare valori o soglie. Rispondi solo su questo stato. Non annunciare spostamenti non applicati, non proporre nuove conferme per fatti già comunicati.`);
        return { type: 'IGNORE' };
      }
      await this.respond('tools', 'Interpreta il turno audio corrente. Emetti nello stesso gruppo tutti gli strumenti necessari prima di parlare. Per una domanda usa riferimenti_fonti (vuoto se fuori fonte). Non emettere una risposta parlata in questa fase.');
      if (!signal.aborted) fresh.forEach(t => this.processedInputs.add(t.id));
      return { type: 'IGNORE' };
    }, () => {}, state => { if (!this.responseActive && !this.playing && this.connected) this.update({ state }); }, error => this.report(error));
  }

  private report(error: unknown) { this.update({ error: error instanceof Error ? error.message : 'Connessione vocale non disponibile.' }); }
  /** Meter the existing streams locally; never open another microphone or play audio twice. */
  private meter(stream: MediaStream, direction: 'input' | 'output') {
    if (!window.AudioContext) return;
    try {
      const context = this.meterContext ??= new AudioContext();
      void context.resume().catch(() => {});
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .75;
      source.connect(analyser);
      if (direction === 'input') { this.inputMeter?.disconnect(); this.inputMeter = source; this.update({ inputAnalyser: analyser }); }
      else { this.outputMeter?.disconnect(); this.outputMeter = source; this.update({ outputAnalyser: analyser }); }
    } catch { /* Visual metering must never interrupt the voice connection. */ }
  }
  private async api(path: string, body: unknown, signal?: AbortSignal) {
    const response = await fetch(`/api/assistant/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.any([this.lifecycle.signal, AbortSignal.timeout(25000), ...(signal ? [signal] : [])]),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Servizio vocale non disponibile.');
    return data;
  }
  async start(listen = true) {
    this.update({ state: 'connecting', error: '', decision: null, transcript: '' });
    try {
      if (!window.RTCPeerConnection) throw new Error('Usa un browser con WebRTC.');
      if (listen) {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfono non disponibile in questo browser.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (this.closed) { stream.getTracks().forEach(t => t.stop()); return; }
        this.stream = stream;
        this.meter(stream, 'input');
        stream.getTracks().forEach(t => t.addEventListener('ended', () => this.disableMicrophone()));
        this.update({ microphone: true });
      } else this.update({ microphone: false });
      const initialContext = this.context;
      const session = await this.api('session', { context: initialContext });
      if (this.closed) return;
      this.token = session.token;
      if (initialContext.revision !== this.context.revision) await this.api('context', { context: this.context });
      this.expiry = setTimeout(() => this.fail('Sessione terminata dopo 30 minuti. Puoi avviarla nuovamente.'), Math.max(0, session.expiresAt - Date.now()));
      const pc = new RTCPeerConnection(); this.pc = pc;
      this.audio.autoplay = true;
      pc.ontrack = e => { const stream = e.streams[0] ?? new MediaStream([e.track]); this.audio.srcObject = stream; this.meter(stream, 'output'); void this.audio.play().catch(() => this.fail('Il browser ha bloccato l’audio. Riavvia l’assistente e consenti la riproduzione.')); };
      pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState) && !this.closed) this.fail('Collegamento vocale interrotto. Riavvia l’assistente.'); };
      if (this.stream) this.stream.getTracks().forEach(t => { this.sender = pc.addTrack(t, this.stream!); });
      else this.sender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
      const channel = pc.createDataChannel('oai-events'); this.channel = channel;
      channel.onmessage = event => { try { this.event(JSON.parse(event.data)); } catch { this.fail('Evento vocale non valido. Riavvia l’assistente.'); } };
      channel.onclose = () => { if (!this.closed) this.fail('Sessione vocale chiusa.'); };
      channel.onerror = () => this.fail('Errore del collegamento vocale.');
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST', body: offer.sdp, headers: { Authorization: `Bearer ${session.clientSecret}`, 'Content-Type': 'application/sdp' },
        signal: AbortSignal.any([this.lifecycle.signal, AbortSignal.timeout(20000)]),
      });
      if (!response.ok) throw new Error(`Impossibile collegare la voce (${response.status}).`);
      await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      if (!this.connected) this.watchdog = setTimeout(() => this.fail('Tempo di connessione scaduto.'), 15000);
    } catch (error) { if (!this.closed) { this.report(error); this.stop(); } }
  }
  async enableMicrophone() {
    if (this.closed || !this.connected || this.stream || !this.sender || this.microphoneRequest) return;
    this.microphoneRequest = true;
    const revision = this.microphoneRevision;
    let pendingStream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfono non disponibile in questo browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.closed) { stream.getTracks().forEach(t => t.stop()); return; }
      pendingStream = stream;
      if (revision !== this.microphoneRevision) { stream.getTracks().forEach(t => t.stop()); return; }
      await this.sender.replaceTrack(stream.getAudioTracks()[0] ?? stream.getTracks()[0]);
      if (this.closed || revision !== this.microphoneRevision) { await this.sender.replaceTrack(null); stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      this.meter(stream, 'input');
      stream.getTracks().forEach(t => t.addEventListener('ended', () => this.disableMicrophone()));
      this.update({ microphone: true, error: '' });
    } catch (error) { pendingStream?.getTracks().forEach(t => t.stop()); this.report(error); }
    finally { this.microphoneRequest = false; }
  }
  disableMicrophone() {
    this.microphoneRevision++;
    const stream = this.stream; this.stream = undefined;
    this.inputMeter?.disconnect(); this.inputMeter = undefined; this.update({ inputAnalyser: null });
    void this.sender?.replaceTrack(null).catch(error => this.report(error));
    stream?.getTracks().forEach(t => t.stop());
    this.inputRevisions.clear(); this.controller.updateContext(this.context); this.controller.inputStopped(); this.update({ microphone: false, userSpeaking: false });
  }
  sendText(value: string) {
    const text = value.trim().slice(0, 2000);
    if (!text || this.closed) return;
    if (!this.connected) { this.pendingText = text; this.update({ state: 'connecting', userSpeaking: false }); return; }
    this.interrupt();
    if (this.stream) this.disableMicrophone();
    this.greeting = undefined;
    const id = `text-${crypto.randomUUID()}`;
    this.send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    this.controller.inputStarted();
    this.controller.commit(id, null); this.controller.transcript(id, text); this.controller.inputStopped();
    this.update({ userSpeaking: false, state: 'analyzing' });
  }
  private send(event: unknown) { if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event)); }
  private event(e: Record<string, any>) {
    if (this.closed) return;
    switch (e.type) {
      case 'session.created': this.connected = true; clearTimeout(this.watchdog); this.update({ state: 'listening' }); if (this.pendingText) { const text = this.pendingText; this.pendingText = undefined; this.greeting = undefined; this.sendText(text); break; } if (this.greeting) { this.greetingPending = false; void this.respond('entry', 'Saluto iniziale'); } else void this.enterStep(); break;
      case 'input_audio_buffer.speech_started':
        if (!this.stream) break;
        this.inputRevisions.set(e.item_id, this.context.revision);
        if (this.inputRevisions.size > 64) this.inputRevisions.delete(this.inputRevisions.keys().next().value!);
        this.controller.inputStarted(); this.interrupt(); this.update({ userSpeaking: true }); this.pending = undefined; break;
      case 'input_audio_buffer.speech_stopped': this.update({ userSpeaking: false }); this.turnEndedAt = performance.now(); this.controller.inputStopped(); break;
      case 'input_audio_buffer.committed':
        if (this.inputRevisions.get(e.item_id) === this.context.revision) this.controller.commit(e.item_id, e.previous_item_id ?? null); break;
      case 'conversation.item.input_audio_transcription.completed':
        if (this.inputRevisions.get(e.item_id) !== this.context.revision) break;
        this.update({ transcript: e.transcript }); this.controller.transcript(e.item_id, e.transcript); break;
      case 'conversation.item.input_audio_transcription.failed':
        if (this.inputRevisions.get(e.item_id) !== this.context.revision) break;
        this.controller.transcriptionFailed(e.item_id); this.report(new Error('Frase non trascritta. Ripeti quando vuoi.')); break;
      case 'response.created':
        if (!this.requestId || e.response?.metadata?.request_id !== this.requestId) {
          this.send({ type: 'response.cancel', response_id: e.response?.id }); this.send({ type: 'output_audio_buffer.clear' }); break;
        }
        this.responseId = e.response.id; this.responseActive = true; break;
      case 'output_audio_buffer.started':
        if (this.responseMode === 'tools') { this.send({ type: 'output_audio_buffer.clear' }); break; }
        if (!this.requestId || (e.response_id && e.response_id !== this.responseId)) { this.send({ type: 'output_audio_buffer.clear' }); break; }
        this.audio.muted = false;
        const narrationVisit = this.responseMode === 'entry' && this.responseId && !this.narratedResponses.has(this.responseId) ? this.context.visit : undefined;
        if (narrationVisit && this.responseId) this.narratedResponses.add(this.responseId);
        this.playing = true; this.controller.outputStarted(); this.update({ narrationVisit, state: 'speaking', latency: this.turnEndedAt ? Math.round(performance.now() - this.turnEndedAt) : undefined }); break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        if (e.response_id && e.response_id !== this.responseId) break;
        this.playing = false; this.outputFinished = true; if (!this.responseActive) this.outputEnded(); break;
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        if (e.response_id !== this.responseId || !this.requestId) break;
        this.spokenTranscript += e.delta ?? ''; this.update({ assistantTranscript: this.spokenTranscript }); break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        if (e.response_id !== this.responseId || !this.requestId) break;
        this.spokenTranscript = e.transcript ?? this.spokenTranscript; this.update({ assistantTranscript: this.spokenTranscript }); this.logExchange(false); break;
      case 'response.done': {
        if (e.response?.metadata?.request_id !== this.requestId || this.completedResponses.has(e.response.id)) break;
        this.completedResponses.add(e.response.id);
        this.responseActive = false;
        if (e.response.status !== 'completed') {
          if (e.response.status === 'failed') this.report(new Error('Risposta vocale non riuscita.'));
          this.outputEnded(); break;
        }
        const calls = (e.response.output ?? []).filter((item: any) => item.type === 'function_call');
        if (this.responseMode === 'tools') {
          this.outputEnded();
          if (calls.length) void this.runTools(calls);
          else void this.respond('answer', 'Nessun aggiornamento è stato applicato. Rispondi solo alla domanda o chiedi chiarimento; non dichiarare azioni eseguite.');
        } else if (this.outputFinished) this.outputEnded();
        break;
      }
      case 'error':
        // VAD can cancel before our explicit barge-in cancellation reaches the server.
        if (e.error?.code === 'response_cancel_not_active') break;
        this.fail('Il servizio vocale ha segnalato un errore. Riavvia la sessione.'); break;
    }
  }
  private async respond(mode: 'entry' | 'tools' | 'answer', objective: string) {
    if (!this.connected || this.closed || this.responseActive || this.playing) return;
    const before = this.context; const interaction = this.interaction;
    this.update({ state: 'analyzing' });
    try {
      await this.contextSync;
      const config = await this.api('realtime-config', { revision: before.revision, visit: before.visit, sessionKey: before.sessionKey });
      if (this.closed || interaction !== this.interaction || this.context.revision !== before.revision) return;
      this.spokenTranscript = ''; this.responseTurn = this.latestTurn; this.responseMode = mode;
      this.responseActive = true; this.outputFinished = false; this.requestId = crypto.randomUUID(); this.controller.outputStarted();
      this.update({ assistantTranscript: '', interrupted: false, decision: { type: 'SPEAK', message: mode === 'entry' ? `Spiegazione del passaggio corrente` : config.nextQuestion ? `Eventuale domanda successiva: ${config.nextQuestion}` : 'Risposta alla conversazione corrente', guidelineId: this.citedSources[0] ?? '', targetId: before.step, priority: 'normal' } });
      this.watchdog = setTimeout(() => this.fail('La risposta AI non è arrivata in tempo.'), 45000);
      const entryText = this.greeting && !this.greetingPending ? this.greeting : entryScriptFor(before);
      this.greeting = undefined;
      this.send({ type: 'response.create', response: {
        // Keep the native conversation, including the user's audio and tool results.
        output_modalities: [mode === 'tools' ? 'text' : 'audio'],
        ...(mode !== 'tools' ? { conversation: 'none', input: [] } : {}),
        tools: config.tools, tool_choice: mode === 'tools' ? 'required' : 'none',
        metadata: { request_id: this.requestId, visit: before.visit ?? '', turn_id: this.latestTurn?.id ?? '', mode },
        instructions: `${config.instructions}\nOBIETTIVO DI QUESTA RISPOSTA: ${mode === 'entry' ? `Spiega soltanto il passaggio attivo ${before.step}. Ignora i passaggi precedenti della conversazione. Leggi fedelmente questo testo predefinito della piattaforma, senza aggiunte cliniche o parafrasi: ${entryText}` : objective}\n${italianVoiceInstructions}`,
      } });
    } catch (error) { if (!this.closed && interaction === this.interaction) this.report(error); }
  }
  private async runTools(items: any[]) {
    const before = this.context; const interaction = this.interaction; const turn = this.responseTurn;
    if (!turn || this.closed) return;
    const controller = new AbortController(); this.toolRequest = controller;
    try {
      const calls: ToolCall[] = items.map(item => ({ id: item.call_id, name: item.name, arguments: JSON.parse(item.arguments) }));
      const result: GuidedResult = await this.api('realtime-tools', { revision: before.revision, visit: before.visit, sessionKey: before.sessionKey, turnId: turn.id, sequence: ++this.sequence, calls }, controller.signal);
      if (this.closed || controller.signal.aborted || interaction !== this.interaction || before.revision !== this.context.revision) return;
      this.citedSources = result.sources;
      this.applyingTools = true;
      this.update({ guided: result });
      // The UI applies the authorized action and synchronously supplies its actual context.
      await this.contextSync;
      if (this.closed || interaction !== this.interaction) { this.applyingTools = false; return; }
      for (const call of calls) this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: call.id, output: JSON.stringify({ ok: true, observations: result.observations, missing: result.missing, nextQuestion: result.question, sources: result.sources, directive: result.message, state: this.context, transitioned: this.context.visit !== before.visit }) } });
      this.applyingTools = false;
      if (this.context.finished) return;
      if (result.action.intent === 'repeat') this.update({ replayVisit: this.context.visit });
      if (this.context.visit !== before.visit || result.action.intent === 'repeat') { await this.enterStep(); return; }
      this.update({ decision: { type: 'SPEAK', message: result.message || 'Risposta alla conversazione corrente', guidelineId: result.sources[0] ?? '', targetId: before.step, priority: 'normal' } });
      await this.respond('answer', 'Gli strumenti sono stati eseguiti e lo stato dell’app è aggiornato. Rispondi naturalmente alla conversazione. Se non è cambiato step, chiedi soltanto la prima informazione mancante, se pertinente. Non chiedere conferme aggiuntive. Non leggere un testo precomposto.');
    } catch (error) {
      this.applyingTools = false;
      if (this.closed || controller.signal.aborted || interaction !== this.interaction) return;
      for (const item of items) this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Strumento non applicabile.', state: this.context }) } });
      await this.respond('answer', 'Lo strumento è stato rifiutato. Non dichiarare aggiornamenti eseguiti. Confronta il risultato con il contesto e chiedi soltanto un dato effettivamente indispensabile e non già fornito; non chiedere una conferma generica.');
    }
  }
  private logExchange(interrupted: boolean) {
    if (!this.responseId || !this.spokenTranscript || this.loggedResponses.has(this.responseId)) return;
    this.loggedResponses.add(this.responseId);
    void this.api('exchange', { revision: this.context.revision, visit: this.context.visit, sessionKey: this.context.sessionKey, responseId: this.responseId, turnId: this.responseTurn?.id, assistant: this.spokenTranscript.slice(0, 14000), interrupted }).catch(() => {});
  }
  private outputEnded() { clearTimeout(this.watchdog); this.controller.outputStopped(); if (!this.closed) this.update({ state: 'listening' }); }
  private cancelPlayback() {
    // Out-of-band responses (conversation: 'none') must be cancelled by ID.
    // Mute immediately as well, so buffered WebRTC audio cannot speak over the user.
    this.audio.muted = true;
    if (this.responseActive || this.playing) { this.logExchange(true); this.update({ interrupted: true }); }
    if (this.responseActive) this.send({ type: 'response.cancel', ...(this.responseId ? { response_id: this.responseId } : {}) });
    if (this.playing || this.responseActive) this.send({ type: 'output_audio_buffer.clear' });
    this.requestId = undefined; this.responseId = undefined; this.responseActive = false; this.playing = false; this.outputEnded();
  }
  interrupt() {
    this.pendingText = undefined;
    this.interaction++; this.toolRequest?.abort(); this.controller.cancelPending();
    this.cancelPlayback();
  }
  async enterStep(context?: Context) {
    if (context) this.updateContext(context, false);
    if (!this.connected || this.closed) return;
    this.interrupt(); this.citedSources = [];
    await this.respond('entry', 'Introduci di nuovo lo step attivo e spiega tutti gli interventi e approfondimenti in ordine. Poi poni soltanto la prima domanda mancante. Non registrare alcuna azione.');
  }
  updateContext(context: Context, introduce = true) {
    const changed = context.visit !== this.context.visit;
    if (changed) { if (this.applyingTools) this.cancelPlayback(); else this.interrupt(); }
    this.context = context; this.pending = undefined;
    if (changed) { this.processedInputs.clear(); this.controller.enterStep(context); } else this.controller.updateObservations(context);
    if (changed) { this.update({ userSpeaking: false, decision: null, transcript: '', assistantTranscript: '' }); }
    if (this.token) this.contextSync = this.contextSync.then(() => this.api('context', { context })).catch(error => { if (!this.closed) { this.report(error); this.stop(); } throw error; });
    void this.contextSync.catch(() => {});
    if (changed && introduce && this.connected && !this.applyingTools) void this.enterStep();
  }
  async action(accept: boolean) {
    const p = this.pending; if (!p) throw new Error('Proposta superata.');
    const interaction = this.interaction;
    this.pending = undefined;
    const result = await this.api('action', { proposalId: p.id, revision: p.revision, accept });
    if (this.closed || p.revision !== this.context.revision || interaction !== this.interaction) throw new Error('Proposta superata da una nuova interazione.');
    this.update({ decision: null }); return result;
  }
  private fail(message: string) { if (!this.closed) { this.report(new Error(message)); this.stop(); } }
  stop() {
    if (this.closed) return;
    this.closed = true; this.toolRequest?.abort(); this.controller.stop(); this.lifecycle.abort(); clearTimeout(this.watchdog); clearTimeout(this.expiry);
    this.pendingText = undefined;
    this.inputMeter?.disconnect(); this.outputMeter?.disconnect();
    void this.meterContext?.close().catch(() => {}); this.meterContext = undefined;
    this.update({ inputAnalyser: null, outputAnalyser: null });
    this.stream?.getTracks().forEach(t => t.stop()); this.channel?.close(); this.pc?.close(); this.audio.pause(); this.audio.srcObject = null;
    if (this.token) void fetch('/api/assistant/stop', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` }, body: '{}', keepalive: true }).catch(() => {});
    this.pending = undefined; this.update({ state: 'off', userSpeaking: false, microphone: false, decision: null, transcript: '' });
  }
}
