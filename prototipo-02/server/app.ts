import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { canComplete, type Context, type Decision, type Turn } from '../src/assistant/protocol.ts';
import { steps } from '../src/flow.ts';
import { validateContext, validateDecision } from './policy.ts';
import { evaluate, openai, realtimeConfig } from './provider.ts';

type Active = { context: Context; expires: number; sequence: number; busy?: AbortController;
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
export function createAssistantServer(deps = { evaluate, mint: () => openai('realtime/client_secrets', realtimeConfig()) }) {
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
        s.busy?.abort(); s.context = c; s.proposal = undefined; s.recent.clear();
        return reply(200, { ok: true });
      }
      if (body.revision !== s.context.revision || s.context.finished) throw new HttpError(409, 'Il passaggio è cambiato.');
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
