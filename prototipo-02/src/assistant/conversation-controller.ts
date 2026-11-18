import type { Authorized } from './assessment';
import type { Context, Decision, Turn } from './protocol';

type Item = { id: string; previous: string | null; text?: string; failed?: boolean };
export class ConversationController {
  private items: Item[] = [];
  private early = new Map<string, string>();
  private timer?: ReturnType<typeof setTimeout>;
  private request?: AbortController;
  private generation = 0;
  private sequence = 0;
  private speaking = false;
  private output = false;
  private stopped = false;
  private applied = new Set<string>();
  private last = '';
  constructor(private context: Context,
    private evaluate: (context: Context, turns: Turn[], sequence: number, signal: AbortSignal) => Promise<Decision>,
    private deliver: (decision: Decision) => void,
    private status: (state: 'listening' | 'analyzing') => void,
    private error: (error: unknown) => void) {}
  private invalidate() { this.generation++; this.request?.abort(); clearTimeout(this.timer); }
  inputStarted() { this.speaking = true; this.invalidate(); this.status('listening'); }
  inputStopped() { this.speaking = false; this.schedule(); }
  outputStarted() { this.output = true; }
  outputStopped() { this.output = false; this.schedule(); }
  cancelPending() { this.invalidate(); this.last = JSON.stringify(this.items.filter(t => t.text?.trim()).map(t => ({ id: t.id, text: t.text! }))); }
  commit(id: string, previous: string | null) {
    if (this.items.some(t => t.id === id)) return;
    const text = this.early.get(id); this.early.delete(id);
    // Committed events establish chronological order, independently of transcription completion.
    const after = this.items.findIndex(t => t.id === previous);
    const before = this.items.findIndex(t => t.previous === id);
    const index = after >= 0 ? after + 1 : before >= 0 ? before : this.items.length;
    this.items.splice(index, 0, { id, previous, text });
    this.items = this.items.slice(-8); this.invalidate(); this.schedule();
  }
  transcript(id: string, text: string) {
    const item = this.items.find(t => t.id === id);
    if (item) item.text = text.slice(0, 2000);
    else { this.early.set(id, text.slice(0, 2000)); if (this.early.size > 8) this.early.delete(this.early.keys().next().value!); }
    this.invalidate(); this.schedule();
  }
  transcriptionFailed(id: string) { const item = this.items.find(t => t.id === id); if (item) item.failed = true; this.invalidate(); this.schedule(); }
  updateContext(context: Context) { this.invalidate(); this.context = context; this.items = []; this.early.clear(); this.last = ''; }
  enterStep(context: Context) { this.updateContext(context); }
  updateObservations(context: Context) { this.updateContext(context); }
  authorizedAction(action: Authorized) {
    if (this.stopped || action.sessionKey !== this.context.sessionKey || action.visit !== this.context.visit || this.applied.has(action.turn)) return false;
    this.applied.add(action.turn); return true;
  }
  stop() { this.stopped = true; this.invalidate(); this.items = []; this.early.clear(); }
  private schedule() {
    clearTimeout(this.timer);
    if (this.stopped || this.speaking || this.output || this.context.finished) return;
    this.timer = setTimeout(() => void this.flush(), 350);
  }
  private async flush() {
    if (this.stopped || this.speaking || this.output || !this.items.length || this.items.some(t => t.text === undefined && !t.failed)) return;
    // A failed latest transcription cannot safely trigger an old turn's action.
    if (this.items.at(-1)?.failed) return;
    const turns = this.items.filter(t => t.text?.trim()).map(t => ({ id: t.id, text: t.text! }));
    const signature = JSON.stringify(turns);
    if (!turns.length || signature === this.last) return;
    const generation = this.generation;
    const request = new AbortController(); this.request = request;
    this.status('analyzing');
    try {
      const decision = await this.evaluate(this.context, turns, ++this.sequence, request.signal);
      if (this.stopped || request.signal.aborted || generation !== this.generation) return;
      this.last = signature; this.status('listening');
      if (decision.type !== 'IGNORE' && decision.guided && !this.authorizedAction(decision.guided.action)) return;
      this.deliver(decision);
    } catch (error) { if (!request.signal.aborted && !this.stopped) { this.status('listening'); this.error(error); } }
  }
}
