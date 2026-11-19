import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function Correctives() {
  return (
    <StepFrame step="correctives" footer={<Continue step="correctives" />}>
      <ActionContent step="correctives" />
    </StepFrame>
  );
}
