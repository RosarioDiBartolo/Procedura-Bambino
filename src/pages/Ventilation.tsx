import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function Ventilation() {
  return (
    <StepFrame step="ppv" footer={<Continue step="ppv" />}>
      <ActionContent step="ppv" />
    </StepFrame>
  );
}
