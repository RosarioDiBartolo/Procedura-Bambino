import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
export default function Initial() {
  return (
    <StepFrame
      step="initial"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="initial" />
    </StepFrame>
  );
}
