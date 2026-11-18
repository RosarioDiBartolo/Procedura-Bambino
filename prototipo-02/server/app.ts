import { nativeConfiguration, executeTools } from './native-realtime.ts';
import { interpret, newDialogue, resolveTurn, type Dialogue } from './guided.ts';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { canComplete, type Context, type Decision, type Turn } from '../src/assistant/protocol.ts';
import { steps } from '../src/flow.ts';
import { validateContext, validateDecision } from './policy.ts';
import { evaluate, openai, realtimeConfig } from './provider.ts';

type Active = { utterances?: Map<string, Turn>; calls?: Set<string>; exchanges?: Set<string>; dialogue?: Dialogue; context: Context; expires: number; sequence: number; busy?: AbortController;
  recent: Map<string, number>; proposal?: { id: string; revision: number; expires: number; decision: Exclude<Decision, { type: 'IGNORE' }> } };
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
async function readBody(req: IncomingMessage) {
  if (req.headers['content-type'] !== 'application/json') throw new HttpError(415, 'Formato non supportato.');
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 24000) throw new HttpError(413, 'Richiesta troppo grande.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new HttpError(400, 'Richiesta non valida.'); }
}
function readTurns(value: unknown): Turn[] {
  if (!Array.isArray(value) || !value.length || value.length > 8 || value.some(t => !t || typeof t.id !== 'string' || t.id.length > 100 || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 2000) || new Set(value.map(t => t.id)).size !== value.length) throw new HttpError(400, 'Turni non validi.');
  return value.map(({ id, text }) => ({ id, text }));
}
export function createAssistantServer(deps: { evaluate: typeof evaluate; mint: () => Promise<any>; interpret?: typeof interpret } = { evaluate, mint: () => openai('realtime/client_secrets', realtimeConfig()), interpret }) {
  const sessions = new Map<string, Active>();
  let starts: number[] = [];
  return createServer(async (req, res) => {
    const reply = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    try {
      const origin = req.headers.origin;
      const allowed = ['http://127.0.0.1:5180', 'http://localhost:5180'];
      if (origin && !allowed.includes(origin)) throw new HttpError(403, 'Origine non autorizzata.');
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? '')) throw new HttpError(403, 'Host non autorizzato.');
      if (req.url === '/api/assistant/status' && req.method === 'GET') return reply(200, { configured: !!process.env.OPENAI_API_KEY });
      if (req.method !== 'POST') throw new HttpError(405, 'Metodo non supportato.');
      if (!origin) throw new HttpError(403, 'Origine mancante.');
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Richiesta non valida.');
      const now = Date.now();
      for (const [key, s] of sessions) if (s.expires < now) { s.busy?.abort(); sessions.delete(key); }
      if (req.url === '/api/assistant/session') {
        let context: Context; try { context = validateContext(body.context); } catch { throw new HttpError(400, 'Contesto non valido.'); }
        starts = starts.filter(t => now - t < 60000);
        if (starts.length >= 6 || sessions.size >= 20) throw new HttpError(429, 'Troppe sessioni. Attendi un minuto.');
        starts.push(now);
        const minted = await deps.mint();
        if (res.destroyed) return;
        if (typeof minted.value !== 'string') throw new Error('Credenziale vocale non disponibile.');
        const token = randomUUID();
        sessions.set(token, { context, expires: now + 30 * 60000, sequence: 0, recent: new Map() });
        return reply(200, { token, clientSecret: minted.value, expiresAt: now + 30 * 60000 });
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
      const s = sessions.get(token);
      if (!s) throw new HttpError(401, 'Sessione vocale scaduta. Avviala nuovamente.');
      if (req.url === '/api/assistant/stop') { s.busy?.abort(); sessions.delete(token); return reply(200, { ok: true }); }
      if (req.url === '/api/assistant/context') {
        let c: Context; try { c = validateContext(body.context); } catch { throw new HttpError(400, 'Contesto non valido.'); }
        if (c.revision <= s.context.revision || c.sessionKey !== s.context.sessionKey) throw new HttpError(409, 'Contesto superato.');
        s.busy?.abort(); if (c.visit !== s.context.visit) { s.dialogue = newDialogue(); s.utterances?.clear(); }
        if (c.observations) { s.dialogue ??= newDialogue(); s.dialogue.observations = c.observations; }
        s.context = c; s.proposal = undefined; s.recent.clear();
        return reply(200, { ok: true });
      }
      if (body.revision !== s.context.revision || s.context.finished) throw new HttpError(409, 'Il passaggio è cambiato.');
      if (['/api/assistant/realtime-config', '/api/assistant/utterance', '/api/assistant/realtime-tools', '/api/assistant/exchange'].includes(req.url ?? '')) {
        if (body.visit !== s.context.visit || body.sessionKey !== s.context.sessionKey) throw new HttpError(409, 'Visita superata.');
        const dialogue = s.dialogue ??= { ...newDialogue(), observations: s.context.observations ?? {} };
        if (req.url === '/api/assistant/exchange') {
          if (typeof body.responseId !== 'string' || body.responseId.length > 100 || typeof body.assistant !== 'string' || body.assistant.length > 14000) throw new HttpError(400, 'Scambio non valido.');
          s.exchanges ??= new Set();
          if (!s.exchanges.has(body.responseId)) {
            s.exchanges.add(body.responseId);
            dialogue.history = [...dialogue.history, { user: s.utterances?.get(body.turnId)?.text ?? '[Ingresso nello step]', assistant: `${body.assistant}${body.interrupted ? ' [interrotta]' : ''}` }].slice(-8);
          }
          return reply(200, { ok: true });
        }
        if (req.url === '/api/assistant/realtime-config') {
          const c = s.context;
          const config = await nativeConfiguration(c, dialogue);
          if (c !== s.context || sessions.get(token) !== s) throw new HttpError(409, 'Configurazione superata.');
          return reply(200, config);
        }
        if (req.url === '/api/assistant/utterance') {
          const turn = readTurns([body.turn])[0];
          s.utterances ??= new Map();
          const old = s.utterances.get(turn.id);
          if (old && old.text !== turn.text) throw new HttpError(409, 'Trascrizione già registrata.');
          s.utterances.set(turn.id, turn);
          if (s.utterances.size > 32) s.utterances.delete(s.utterances.keys().next().value!);
          if (dialogue.processed.has(turn.id)) throw new HttpError(409, 'Turno già elaborato.');
          s.busy?.abort(); const controller = new AbortController(); s.busy = controller;
          res.on('close', () => { if (!res.writableEnded) controller.abort(); });
          const context = s.context;
          const draft = { ...dialogue, observations: { ...dialogue.observations }, history: [...dialogue.history], processed: new Set(dialogue.processed) };
          const interpreted: any = await (deps.interpret ?? interpret)(context, [turn], controller.signal, draft);
          if (controller.signal.aborted || s.context !== context || sessions.get(token) !== s) throw new HttpError(409, 'Risposta superata.');
          // Events already declared by the operator must be applied, not turned into a page asking for the same event.
          const raw = ['birth', 'medication', 'finish'].includes(interpreted?.event)
            ? { ...interpreted, intent: interpreted.event }
            : interpreted?.intent === 'orient' && interpreted.scenario === 'birth' && interpreted.eventNow === true
              ? { ...interpreted, intent: 'birth' } : interpreted;
          const guided = raw?.intent === 'orient'
            ? executeTools(context, draft, [{ id: `orientation:${turn.id}`, name: 'orienta_scenario', arguments: { scenario: raw.scenario, data: raw.data ?? [] } }], turn)
            : resolveTurn(context, draft, raw, turn);
          dialogue.processed.add(turn.id); dialogue.history = draft.history;
          return reply(200, { ok: true, guided });
        }
        const turn = s.utterances?.get(body.turnId);
        if (!turn) throw new HttpError(409, 'Turno non trascritto o superato.');
        if (!Number.isSafeInteger(body.sequence) || body.sequence <= s.sequence) throw new HttpError(409, 'Turno superato.');
        if (!Array.isArray(body.calls) || body.calls.some((c: any) => s.calls?.has(c?.id))) throw new HttpError(409, 'Chiamata duplicata.');
        s.sequence = body.sequence;
        try {
          const draft = { ...dialogue, observations: { ...dialogue.observations }, history: [...dialogue.history], processed: new Set(dialogue.processed) };
          const result = executeTools(s.context, draft, body.calls, turn);
          // Observations become session state only when the UI acknowledges its applied context.
          if (draft.processed.has(turn.id)) dialogue.processed.add(turn.id);
          s.calls ??= new Set(); body.calls.forEach((call: any) => s.calls!.add(call.id));
          return reply(200, result);
        } catch (error) { throw new HttpError(409, error instanceof Error ? error.message : 'Strumento non applicabile.'); }
      }
      if (['/api/assistant/turn', '/api/assistant/enter'].includes(req.url ?? '')) {
        if (body.visit !== s.context.visit || body.sessionKey !== s.context.sessionKey) throw new HttpError(409, 'Visita superata.');
        const entry = req.url === '/api/assistant/enter';
        const turn = readTurns([body.turn])[0];
        const dialogue = s.dialogue ??= { ...newDialogue(), observations: s.context.observations ?? {} };
        if (dialogue.processed.has(turn.id)) throw new HttpError(409, 'Turno già elaborato.');
        if (!Number.isSafeInteger(body.sequence) || body.sequence <= s.sequence) throw new HttpError(409, 'Turno superato.');
        s.sequence = body.sequence; s.busy?.abort();
        const controller = new AbortController(); s.busy = controller;
        res.on('close', () => { if (!res.writableEnded) controller.abort(); });
        const raw = await (deps.interpret ?? interpret)(s.context, [turn], controller.signal, dialogue, entry);
        if (controller.signal.aborted || body.sequence !== s.sequence || body.revision !== s.context.revision || sessions.get(token) !== s) throw new HttpError(409, 'Risposta superata.');
        return reply(200, resolveTurn(s.context, dialogue, raw, turn, entry));
      }
      if (req.url === '/api/assistant/action') {
        const p = s.proposal;
        if (!p || p.id !== body.proposalId || p.revision !== s.context.revision || p.expires < now) throw new HttpError(409, 'Proposta scaduta o superata.');
        s.proposal = undefined; // Single use, including dismissals.
        if (body.accept !== true) return reply(200, { applied: false });
        if (p.decision.action === 'complete_step' && !canComplete(s.context)) throw new HttpError(409, 'Verifiche non più valide.');
        return reply(200, { applied: true, action: p.decision.action, targetId: p.decision.targetId, next: p.decision.action === 'complete_step' ? steps[s.context.step].next : null });
      }
      if (req.url !== '/api/assistant/decide') throw new HttpError(404, 'Endpoint non disponibile.');
      if (!Number.isSafeInteger(body.sequence) || body.sequence <= s.sequence) throw new HttpError(409, 'Turno superato.');
      const turns = readTurns(body.turns);
      s.sequence = body.sequence; s.proposal = undefined; s.busy?.abort();
      const controller = new AbortController(); s.busy = controller;
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      const raw = await deps.evaluate(s.context, turns, controller.signal);
      if (controller.signal.aborted || body.sequence !== s.sequence || body.revision !== s.context.revision || sessions.get(token) !== s) throw new HttpError(409, 'Valutazione superata.');
      const decision = validateDecision(raw, s.context);
      if (decision.type !== 'IGNORE') {
        const key = `${decision.type}:${decision.guidelineId}:${decision.action ?? ''}`;
        if (now - (s.recent.get(key) ?? 0) < 20000) return reply(200, { type: 'IGNORE' });
        s.recent.set(key, now);
        if (decision.type === 'PROPOSE_ACTION') {
          const id = randomUUID(); decision.proposalId = id;
          s.proposal = { id, revision: s.context.revision, expires: Date.now() + 30000, decision };
        }
      }
      return reply(200, decision);
    } catch (err) {
      if (res.destroyed) return;
      reply(err instanceof HttpError ? err.status : 502, { error: err instanceof Error ? err.message : 'Servizio vocale non disponibile.' });
    }
  });
}
