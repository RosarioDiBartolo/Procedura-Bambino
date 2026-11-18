import { Button } from "@nls/ui/components/button";
import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
import { useSession } from "../SessionContext";
import { useNow } from "../useNow";
import { record, secondsFrom, formatTime } from "../flow";
export default function Medication() {
  const [session, setSession] = useSession();
  const now = useNow();
  const lastDose = secondsFrom(session.lastMedicationAt, now);
  return (
    <StepFrame step="medication" footer={<Continue step="medication" />}>
      <ActionContent step="medication" />
      <div className="
      compact-medication py-[9px] px-3 gap-[15px] flex items-center bg-[#f9f5ed] rounded-[8px] shrink-0
      [&_button]:text-[length:11px] [&_button]:h-[35px] [&>span]:text-[length:11px] [&>span]:leading-[1.5]
      [&>span]:text-[#7c704e] max-[699px]:flex-wrap
    ">
        <Button
          variant="outline"
          onClick={() => {
            const at = Date.now();
            setSession((s) =>
              record(
                { ...s, lastMedicationAt: at },
                {
                  at,
                  step: s.step,
                  type: "medication",
                  text: "Somministrazione di adrenalina registrata nello scenario, su conferma del team",
                },
              ),
            );
          }}
        >
          Registra somministrazione
        </Button>
        <span>
          {lastDose === null
            ? "Il timer parte dalla somministrazione confermata."
            : `Ultima somministrazione: ${formatTime(lastDose)} fa${lastDose >= 180 && lastDose <= 300 ? " · intervallo 3–5 min" : lastDose > 300 ? " · oltre 5 min, rivalutare con il team" : ""}`}
        </span>
      </div>
    </StepFrame>
  );
}
