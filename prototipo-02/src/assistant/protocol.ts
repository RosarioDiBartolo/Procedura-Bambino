import { steps, type Session, type StepId } from '../flow.ts';

export type Context = { visit?: string; observations?: import("./assessment.ts").Observations; step: StepId; checks: string[]; revision: number; sessionKey: number; finished: boolean };
export type Decision = { type: 'IGNORE' } | {
  guided?: GuidedResult; type: 'SPEAK' | 'PROPOSE_ACTION'; message: string; guidelineId: string;
  priority: 'normal' | 'urgent'; targetId: string; action?: 'highlight' | 'complete_step'; proposalId?: string;
};
export type Turn = { id: string; text: string };
export function contextOf(s: Session, revision = 0): Context {
  return { visit: `${s.startedAt}:${s.enteredAt}:${s.stack.length}:${s.step}`, observations: s.observations?.visit === `${s.startedAt}:${s.enteredAt}:${s.stack.length}:${s.step}` ? s.observations.values : {}, step: s.step, checks: (steps[s.step].actions ?? []).map((_, i) => `${s.step}-${i}`).filter(id => s.checks[id]), revision, sessionKey: s.startedAt, finished: s.finishedAt !== null };
}
export function contextKey(c: Context) { return JSON.stringify([c.sessionKey, c.visit, c.observations, c.step, [...c.checks].sort(), c.finished]); }
export function canComplete(c: Context) {
  const step = steps[c.step];
  return !c.finished && step.kind === 'action' && !!step.next && step.id !== 'medication' &&
    !!step.actions?.length && step.actions.every((_, i) => c.checks.includes(`${step.id}-${i}`));
}

export type GuidedResult = { message: string; sources: string[]; observations: import('./assessment.ts').Observations; missing: import('./assessment.ts').Field[]; action: import('./assessment.ts').Authorized; question?: import('./assessment.ts').Field };
