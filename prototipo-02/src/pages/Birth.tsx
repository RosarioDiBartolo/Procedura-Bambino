import { ArrowRight } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { StepFrame } from "./StepFrame";
import { StepImage } from "../StepImage";
import { useWorkflow } from "../useWorkflow";
export default function Birth() {
  const { birth } = useWorkflow();
  return (
    <StepFrame step="birth">
      <div className="compact-birth">
        <StepImage step="birth" />
        <div>
          <strong>Conferma la nascita</strong>
          <p>
            Avvia il riferimento temporale quando avviene la nascita nello
            scenario.
          </p>
          <Button size="lg" onClick={birth}>
            Nascita ora · prosegui
            <ArrowRight size={18} />
          </Button>
          <small>
            Il tempo non è avviato automaticamente. Nessun parametro da
            trascrivere.
          </small>
        </div>
      </div>
    </StepFrame>
  );
}
