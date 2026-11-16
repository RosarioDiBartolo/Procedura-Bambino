import { ConversationController } from './conversation-controller';
import type { Context, Decision } from './protocol';

export type VoiceState = 'off' | 'connecting' | 'listening' | 'analyzing' | 'speaking';
export type VoiceUpdate = { state?: VoiceState; error?: string; transcript?: string; decision?: Decision | null; latency?: number };
export class RealtimeClient {
  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private stream?: MediaStream;
  private audio = new Audio();
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
  private pending?: { id: string; revision: number };
  constructor(private context: Context, private update: (value: VoiceUpdate) => void) {
    this.controller = new ConversationController(context, async (c, turns, sequence, signal) => {
      await this.contextSync;
      return this.api('decide', { revision: c.revision, turns, sequence }, signal);
    }, decision => {
      if (decision.type === 'IGNORE') return;
      this.pending = decision.proposalId ? { id: decision.proposalId, revision: this.context.revision } : undefined;
      this.update({ decision }); this.speak(decision.message);
    }, state => { if (!this.responseActive && !this.playing && this.connected) this.update({ state }); }, error => this.report(error));
  }
  private report(error: unknown) { this.update({ error: error instanceof Error ? error.message : 'Connessione vocale non disponibile.' }); }
  private async api(path: string, body: unknown, signal?: AbortSignal) {
    const response = await fetch(`/api/assistant/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.any([this.lifecycle.signal, AbortSignal.timeout(25000), ...(signal ? [signal] : [])]),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Servizio vocale non disponibile.');
    return data;
  }
  async start() {
    this.update({ state: 'connecting', error: '', decision: null, transcript: '' });
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error('Usa un browser con microfono e WebRTC su localhost o HTTPS.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.closed) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      stream.getTracks().forEach(t => t.addEventListener('ended', () => this.fail('Il microfono è stato disconnesso.')));
      const initialContext = this.context;
      const session = await this.api('session', { context: initialContext });
      if (this.closed) return;
      this.token = session.token;
      if (initialContext.revision !== this.context.revision) await this.api('context', { context: this.context });
      this.expiry = setTimeout(() => this.fail('Sessione terminata dopo 30 minuti. Puoi avviarla nuovamente.'), Math.max(0, session.expiresAt - Date.now()));
      const pc = new RTCPeerConnection(); this.pc = pc;
      this.audio.autoplay = true;
      pc.ontrack = e => { this.audio.srcObject = e.streams[0] ?? new MediaStream([e.track]); void this.audio.play().catch(() => this.fail('Il browser ha bloccato l’audio. Riavvia l’assistente e consenti la riproduzione.')); };
      pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState) && !this.closed) this.fail('Collegamento vocale interrotto. Riavvia l’assistente.'); };
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
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
  private send(event: unknown) { if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event)); }
  private event(e: Record<string, any>) {
    if (this.closed) return;
    switch (e.type) {
      case 'session.created': this.connected = true; clearTimeout(this.watchdog); this.update({ state: 'listening' }); break;
      case 'input_audio_buffer.speech_started':
        this.inputRevisions.set(e.item_id, this.context.revision);
        if (this.inputRevisions.size > 64) this.inputRevisions.delete(this.inputRevisions.keys().next().value!);
        this.controller.inputStarted(); this.interrupt(); this.pending = undefined; this.update({ decision: null }); break;
      case 'input_audio_buffer.speech_stopped': this.turnEndedAt = performance.now(); this.controller.inputStopped(); break;
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
        if (!this.requestId || (e.response_id && e.response_id !== this.responseId)) { this.send({ type: 'output_audio_buffer.clear' }); break; }
        this.playing = true; this.controller.outputStarted(); this.update({ state: 'speaking', latency: this.turnEndedAt ? Math.round(performance.now() - this.turnEndedAt) : undefined }); break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        if (e.response_id && e.response_id !== this.responseId) break;
        this.playing = false; this.outputFinished = true; if (!this.responseActive) this.outputEnded(); break;
      case 'response.done':
        if (e.response?.metadata?.request_id !== this.requestId) break;
        this.responseActive = false;
        if (e.response?.status !== 'completed') { if (e.response?.status === 'failed') this.report(new Error('Risposta vocale non riuscita.')); this.outputEnded(); }
        else if (this.outputFinished) this.outputEnded();
        // response.done can precede actual audio playback: wait for buffer.stopped.
        break;
      case 'error':
        // VAD can cancel before our explicit barge-in cancellation reaches the server.
        if (e.error?.code === 'response_cancel_not_active') break;
        this.fail('Il servizio vocale ha segnalato un errore. Riavvia la sessione.'); break;
    }
  }
  private speak(message: string) {
    if (!this.connected || this.closed || this.responseActive || this.playing) return;
    this.responseActive = true; this.outputFinished = false; this.requestId = crypto.randomUUID(); this.controller.outputStarted(); this.update({ state: 'analyzing' });
    this.watchdog = setTimeout(() => this.fail('La risposta vocale non è arrivata in tempo.'), 30000);
    this.send({ type: 'response.create', response: { conversation: 'none', input: [], output_modalities: ['audio'], metadata: { request_id: this.requestId },
      instructions: `Leggi in italiano, con tono naturale e conciso, esclusivamente questo testo autorizzato. Non aggiungere nulla: ${JSON.stringify(message)}` } });
  }
  private outputEnded() { clearTimeout(this.watchdog); this.controller.outputStopped(); if (!this.closed) this.update({ state: 'listening' }); }
  interrupt() {
    this.interaction++;
    this.controller.cancelPending();
    if (this.responseActive) this.send({ type: 'response.cancel' });
    if (this.playing || this.responseActive) this.send({ type: 'output_audio_buffer.clear' });
    this.requestId = undefined; this.responseId = undefined; this.responseActive = false; this.playing = false; this.outputEnded();
  }
  updateContext(context: Context) {
    this.context = context; this.pending = undefined; this.controller.updateContext(context); this.interrupt(); this.update({ decision: null, transcript: '' });
    if (this.token) this.contextSync = this.contextSync.then(() => this.api('context', { context })).catch(error => { if (!this.closed) { this.report(error); this.stop(); } throw error; });
    // Attach a handler immediately, even when no transcript is waiting for sync.
    void this.contextSync.catch(() => {});
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
    this.closed = true; this.controller.stop(); this.lifecycle.abort(); clearTimeout(this.watchdog); clearTimeout(this.expiry);
    this.stream?.getTracks().forEach(t => t.stop()); this.channel?.close(); this.pc?.close(); this.audio.pause(); this.audio.srcObject = null;
    if (this.token) void fetch('/api/assistant/stop', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` }, body: '{}', keepalive: true }).catch(() => {});
    this.pending = undefined; this.update({ state: 'off', decision: null, transcript: '' });
  }
}
