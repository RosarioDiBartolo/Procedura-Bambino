import type { Context, GuidedResult } from '../protocol';
import type { VoiceUpdate } from '../realtime-client';
import { assess, scenarioSteps, type Observations } from '../assessment';
import { steps } from '../../flow';
import { guidelinesFor } from '../guidelines';
export type PlaygroundCommand = { type: 'utterance'; text: string; scenario: string } | { type: 'response'; text: string } | { type: 'listening' | 'loading' | 'interrupt' | 'error' };
const eventName = 'nido-playground-command';
export function sendPlayground(command: PlaygroundCommand) { window.dispatchEvent(new CustomEvent(eventName, { detail: command })); }
/** Local event source. No microphone, fetch, WebRTC or external speech service. */
export class SimulatedClient {
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private closed = false;
  private event = (event: Event) => this.command((event as CustomEvent<PlaygroundCommand>).detail);
  constructor(private context: Context, private update: (update: VoiceUpdate) => void, private greeting?: string) {}
  private later(callback: () => void, delay: number) { const timer = setTimeout(() => { this.timers.delete(timer); if (!this.closed) callback(); }, delay); this.timers.add(timer); }
  async start(listen = true) { window.addEventListener(eventName, this.event); this.update({ state: 'listening', microphone: listen, error: '' }); this.later(() => { if (this.greeting) { this.speak(this.greeting); this.greeting = undefined; } else void this.enterStep(); }, 150); }
  sendText(text: string) { this.interrupt(); this.speak('Messaggio scritto ricevuto nella sessione di prova.'); }
  async enableMicrophone() { this.update({ microphone: true, error: '' }); }
  disableMicrophone() { this.update({ microphone: false, userSpeaking: false }); }
  interrupt() { this.timers.forEach(clearTimeout); this.timers.clear(); this.update({ state: 'listening', userSpeaking: false, interrupted: true }); }
  stop() { this.interrupt(); this.closed = true; window.removeEventListener(eventName, this.event); this.update({ state: 'off', microphone: false }); }
  async action(_accept: boolean): Promise<{ applied: boolean; action: string; targetId: string; next?: string }> { return { applied: false, action: '', targetId: this.context.step }; }
  updateContext(context: Context) { const changed = context.visit !== this.context.visit; this.context = context; if (changed && !this.closed) void this.enterStep(); }
  async enterStep() { this.interrupt(); this.speak([steps[this.context.step].title, ...guidelinesFor(this.context.step).filter(g => !g.id.includes(':detail:')).map(g => g.text)].join('. '), true); }
  private speak(text: string, narration = false) {
    this.interrupt(); this.update({ assistantTranscript: '', interrupted: false, state: 'speaking', ...(narration ? { narrationVisit: this.context.visit } : {}) });
    const words = text.trim().split(/\s+/); let index = 0;
    const tick = () => { index++; this.update({ assistantTranscript: words.slice(0, index).join(' ') }); if (index < words.length) this.later(tick, 85); else this.update({ state: 'listening' }); };
    this.later(tick, 80);
  }
  private command(command: PlaygroundCommand) {
    if (this.closed) return;
    if (command.type === 'interrupt') { this.interrupt(); return; }
    if (command.type === 'listening') { this.interrupt(); this.update({ userSpeaking: true }); return; }
    if (command.type === 'loading') { this.interrupt(); this.update({ state: 'analyzing' }); return; }
    if (command.type === 'error') { this.interrupt(); this.update({ error: 'Errore 429 simulato: nessuna richiesta è stata inviata.', state: 'listening' }); return; }
    if (command.type === 'response') { this.speak(command.text); return; }
    if (command.type !== 'utterance') return;
    this.interrupt(); this.update({ userSpeaking: true, error: '' });
    this.later(() => {
      this.update({ transcript: command.text, userSpeaking: false, state: 'analyzing' });
      this.later(() => {
        const before = this.context;
        const observations: Observations = { ...(before.observations ?? {}) };
        const action: GuidedResult['action'] = { sessionKey: before.sessionKey, visit: before.visit ?? '', turn: crypto.randomUUID(), intent: 'other' };
        if (command.scenario === 'complete' && steps[before.step].kind === 'action') { action.intent = 'complete'; action.next = steps[before.step].next; }
        if (command.scenario === 'birth') action.intent = 'birth';
        if (command.scenario === 'hr50') {
          if (['respiration', 'hr100', 'hr60', 'advanced-hr'].includes(before.step)) { observations.hr = { value: 50, source: 'voice', at: Date.now() }; action.intent = 'observe'; action.next = assess(before.step, observations).next; }
          else { action.intent = 'orient'; action.orientation = { scenario: 'respiration', observations: { hr: { value: 50, source: 'voice', at: Date.now() } } }; action.next = scenarioSteps.respiration; }
        }
        if (command.scenario === 'temperature' && ['preparation', 'birth', 'cord'].includes(before.step)) { action.intent = 'orient'; action.orientation = { scenario: 'temperature', observations: {} }; action.next = 'initial'; }
        this.update({ guided: { action, observations, sources: [], missing: assess(before.step, observations).missing, message: '' } });
        if (this.context.visit === before.visit) this.speak(command.scenario === 'none' ? 'Messaggio ricevuto nel playground. Scegli uno scenario per simulare una decisione, oppure inserisci una risposta manuale.' : 'Scenario applicato alle regole locali. Se restiamo in questo step, mancano dati oppure l’azione selezionata non è applicabile.');
      }, 500);
    }, 250);
  }
}
