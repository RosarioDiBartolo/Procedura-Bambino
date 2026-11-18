import { steps } from '../flow.ts';
import { assess, questions } from './assessment.ts';
import { guidelinesFor } from './guidelines.ts';
import type { Context } from './protocol.ts';
/** The screen and voice read the same step; previous conversation never selects the script. */
export function entryScriptFor(context: Context) {
  const first = assess(context.step, context.observations ?? {}).missing[0];
  return [steps[context.step].title, ...guidelinesFor(context.step).filter(source => !source.id.includes(':detail:')).map(source => source.text), first ? questions[first] : ''].filter(Boolean).join('\n\n');
}
