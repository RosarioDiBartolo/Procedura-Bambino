import { useAssessment } from "../assistant/ObservationFields";
import { Button } from "@nls/ui/components/button";
import { Checkbox } from "@nls/ui/components/checkbox";
import { StepFrame } from "./StepFrame";
import { DecisionContent } from "./DecisionContent";
import { useWorkflow } from "../useWorkflow";
export default function HeartRate60() {
  const { observations, commit } = useAssessment("hr60");
  const effective = observations.effective?.value === true;
  const { change } = useWorkflow();
  return (
    <StepFrame
      step="hr60"
      footer={<small>La scelta apre il passaggio corrispondente.</small>}
    >
      <DecisionContent step="hr60" effective={effective}>
        <div className="
      ventilation-gate py-[7px] px-2.5 gap-2.5 border border-solid border-[rgb(216,_228,_232)] flex items-center
      justify-between rounded-[9px] bg-[#eff5f7] shrink-0 [&_label]:gap-2.5 [&_label]:flex [&_label]:items-center
      [&_label]:text-[length:12px] [&_label]:font-[600] [&_[data-slot=checkbox]]:w-5.5 [&_[data-slot=checkbox]]:h-5.5
      [&_button]:text-[length:10px] [&_button]:h-8 max-[699px]:flex-wrap max-[699px]:[&_label]:text-[length:11px]
    ">
          <label>
            <Checkbox
              checked={effective}
              onCheckedChange={(v) => commit("effective", v === true ? true : null)}
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
