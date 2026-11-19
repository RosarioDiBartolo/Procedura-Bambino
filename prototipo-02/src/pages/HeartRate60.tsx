import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
export default function HeartRate60() {
  return <StepFrame step="hr60" footer={<small>La scelta del caso conferma le condizioni indicate.</small>}>
    <DecisionContent step="hr60" />
  </StepFrame>;
}
