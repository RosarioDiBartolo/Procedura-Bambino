import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
export default function Distress() {
  return (
    <StepFrame
      step="distress"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="distress" />
    </StepFrame>
  );
}
