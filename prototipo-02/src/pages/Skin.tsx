import { ArrowRight, Check } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { StepFrame } from "./StepFrame";
import { ActionContent } from "./ActionContent";
import { useWorkflow } from "../useWorkflow";
export default function Skin() {
  const { change, finish } = useWorkflow();
  return (
    <StepFrame
      step="skin"
      footer={
        <div>
          <Button
            variant="outline"
            onClick={() =>
              change("initial", "Nuova valutazione durante osservazione")
            }
          >
            Nuova valutazione
          </Button>
          <Button onClick={finish}>Concludi scenario</Button>
        </div>
      }
    >
      <ActionContent step="skin" />
    </StepFrame>
  );
}
