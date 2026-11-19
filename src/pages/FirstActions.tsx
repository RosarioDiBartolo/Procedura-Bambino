import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function FirstActions() {
  return (
    <StepFrame step="first-actions" footer={<Continue step="first-actions" />}>
      <ActionContent step="first-actions" />
    </StepFrame>
  );
}
