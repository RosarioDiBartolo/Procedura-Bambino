import { steps, decisionCases, saturation, mrsopa, doppes, type StepId } from '../flow.ts';
export const guidelineVersion = 'sin-2025-prototype-voice-v1';
export type Guideline = { id: string; text: string; source: string; targetId: string };
// Read the same source as the interface: no second clinical procedure to maintain.
export function guidelinesFor(id: StepId): Guideline[] {
  const step = steps[id];
  const entries: Guideline[] = [
    { id: `${id}:overview`, text: step.subtitle, source: step.source, targetId: id },
    ...(step.actions ?? []).map((text, i) => ({ id: `${id}:action:${i}`, text, source: step.source, targetId: `${id}-${i}` })),
    ...(decisionCases[id] ?? []).map(c => ({ id: `${id}:case:${c.id}`, text: `${c.label}. ${c.detail}. ${c.conditions?.join('. ') ?? ''} Passaggio previsto: ${c.destination}.`, source: step.source, targetId: id })),
  ];
  if (step.box) {
    const rows = step.box === 'saturation' ? saturation : step.box === 'mrsopa' ? mrsopa : doppes;
    entries.push({ id: `${id}:support`, text: rows.map(row => row.join(': ')).join('. '), source: `Poster · ${step.box}`, targetId: id });
  }
  return entries;
}
