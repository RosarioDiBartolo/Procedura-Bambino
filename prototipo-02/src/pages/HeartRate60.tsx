import { useState } from "react";
import { Button } from "@nls/ui/components/button";
import { Checkbox } from "@nls/ui/components/checkbox";
import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
import { useWorkflow } from "../useWorkflow";
export default function HeartRate60() {
  const [effective, setEffective] = useState(false);
  const { change } = useWorkflow();
  return (
    <StepFrame
      step="hr60"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="hr60" effective={effective}>
        <div className="ventilation-gate">
          <label>
            <Checkbox
              checked={effective}
              onCheckedChange={(v) => setEffective(v === true)}
            />
            <span>Il team conferma la ventilazione efficace</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              change(
                "correctives",
                "Ritorno ai correttivi: ventilazione da verificare",
              )
            }
          >
            Torna ai correttivi
          </Button>
        </div>
      </DecisionContent>
    </StepFrame>
  );
}
