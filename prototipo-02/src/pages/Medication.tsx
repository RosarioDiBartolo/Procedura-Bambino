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
      <div className="compact-medication">
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
