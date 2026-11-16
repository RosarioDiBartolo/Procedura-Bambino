import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function Preparation() {
  return (
    <StepFrame step="preparation" footer={<Continue step="preparation" />}>
      <ActionContent step="preparation" />
    </StepFrame>
  );
}
