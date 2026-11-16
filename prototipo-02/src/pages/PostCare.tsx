import { ArrowRight, Check } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { StepFrame } from "./StepFrame";
import { ActionContent } from "./ActionContent";
import { useWorkflow } from "../useWorkflow";
export default function PostCare() {
  const { change, finish } = useWorkflow();
  return (
    <StepFrame
      step="post"
      footer={
        <Button onClick={finish}>
          Concludi simulazione
          <Check size={17} />
        </Button>
      }
    >
      <ActionContent step="post" />
    </StepFrame>
  );
}
