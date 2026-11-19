import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
export default function HeartRate100() {
  return (
    <StepFrame
      step="hr100"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="hr100" />
    </StepFrame>
  );
}
