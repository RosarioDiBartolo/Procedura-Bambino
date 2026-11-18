import { artFor } from "./Illustration";
import { getInterventions as textInterventions } from "./procedureKnowledge";
import type { StepId } from "./flow";
export type { InterventionDetail, ActionPanel } from "./procedureKnowledge";
export { isActionPanel } from "./procedureKnowledge";
export function getInterventions(step: StepId) { return textInterventions(step).map(item => ({ ...item, art: item.art || artFor(item.title) })); }
