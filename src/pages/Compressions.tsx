import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function Compressions() {
  return (
    <StepFrame step="compressions" footer={<Continue step="compressions" />}>
      <ActionContent step="compressions" />
    </StepFrame>
  );
}
