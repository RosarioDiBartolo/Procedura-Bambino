import { steps } from '../src/flow.ts';
import { canComplete, type Context, type Decision } from '../src/assistant/protocol.ts';
import { guidelinesFor } from '../src/assistant/guidelines.ts';

export function validateContext(value: unknown): Context {
  const c = value as Context;
  if (!c || !Object.hasOwn(steps, c.step) || !Number.isSafeInteger(c.revision) || c.revision < 0 ||
      !Number.isSafeInteger(c.sessionKey) || c.sessionKey < 0 || typeof c.finished !== 'boolean' ||
      !Array.isArray(c.checks) || c.checks.length > 12 || new Set(c.checks).size !== c.checks.length ||
      c.checks.some(id => !(steps[c.step].actions ?? []).some((_, i) => id === `${c.step}-${i}`))) {
    throw new Error('Contesto della procedura non valido.');
  }
  return { step: c.step, checks: [...c.checks], revision: c.revision, sessionKey: c.sessionKey, finished: c.finished };
}

// Only a source ID and an allowed action cross the model boundary. The model
// cannot supply medical prose or instructions to the voice generation prompt.
export function validateDecision(raw: unknown, c: Context): Decision {
  if (!raw || typeof raw !== 'object' || c.finished) return { type: 'IGNORE' };
  const d = raw as Record<string, unknown>;
  if (!['SPEAK', 'PROPOSE_ACTION'].includes(String(d.type))) return { type: 'IGNORE' };
  const rule = guidelinesFor(c.step).find(r => r.id === d.guidelineId);
  if (!rule) return { type: 'IGNORE' };
  const common = { message: rule.text, guidelineId: rule.id, targetId: rule.targetId, priority: d.priority === 'urgent' ? 'urgent' as const : 'normal' as const };
  if (d.type === 'SPEAK') return { type: 'SPEAK', ...common };
  if (d.action === 'highlight' && d.targetId === rule.targetId) return { type: 'PROPOSE_ACTION', ...common, action: 'highlight' };
  if (d.action === 'complete_step' && d.targetId === c.step && canComplete(c)) {
    return { type: 'PROPOSE_ACTION', ...common, targetId: c.step, action: 'complete_step', message: `Proseguire a «${steps[steps[c.step].next!].title}»? Conferma sullo schermo.` };
  }
  return { type: 'IGNORE' };
}

export const decisionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['IGNORE', 'SPEAK', 'PROPOSE_ACTION'] },
    guidelineId: { type: ['string', 'null'] },
    priority: { type: 'string', enum: ['normal', 'urgent'] },
    action: { type: ['string', 'null'], enum: ['highlight', 'complete_step', null] },
    targetId: { type: ['string', 'null'] },
  }, required: ['type', 'guidelineId', 'priority', 'action', 'targetId'],
};
