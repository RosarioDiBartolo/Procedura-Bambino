import { ArrowRight, Check } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { StepFrame } from "./StepFrame";
import { ActionContent } from "./ActionContent";
import { useWorkflow } from "../useWorkflow";
export default function RecoveryReview() {
  const { change, finish } = useWorkflow();
  return (
    <StepFrame
      step="recovery-review"
      footer={
        <Button
          onClick={() =>
            change("respiration", "Rivalutazione concordata con il team")
          }
        >
          Rivaluta respiro e FC
          <ArrowRight size={17} />
        </Button>
      }
    >
      <ActionContent step="recovery-review" />
    </StepFrame>
  );
}
