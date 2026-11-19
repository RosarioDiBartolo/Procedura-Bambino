import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
export default function Respiration() {
  return (
    <StepFrame
      step="respiration"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="respiration" />
    </StepFrame>
  );
}
