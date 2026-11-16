import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function DistressSupport() {
  return (
    <StepFrame
      step="distress-support"
      footer={<Continue step="distress-support" />}
    >
      <ActionContent step="distress-support" />
    </StepFrame>
  );
}
