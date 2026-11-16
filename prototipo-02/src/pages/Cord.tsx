import { Info } from "@nls/ui/icons8";
import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function Cord() {
  return (
    <StepFrame step="cord" footer={<Continue step="cord" />}>
      <ActionContent step="cord" />
      <p className="compact-clinical-note">
        <Info size={16} />
        <span>
          <strong>Clampaggio e milking:</strong> attendere almeno 60″ prima di
          clampare; considerare milking nei neonati depressi tra 35–42
          settimane. Concorda con il team senza ritardare gli interventi
          necessari.
        </span>
      </p>
    </StepFrame>
  );
}
