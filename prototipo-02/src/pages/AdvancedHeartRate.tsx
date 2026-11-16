import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
export default function AdvancedHeartRate() {
  return (
    <StepFrame
      step="advanced-hr"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="advanced-hr" />
    </StepFrame>
  );
}
