import TextType from '../components/ui/TextType';
import { Info } from "@nls/ui/icons8";
import { StepFrame, Continue } from "./StepFrame";
import { ActionContent } from "./ActionContent";
export default function Cord() {
  return (
    <StepFrame step="cord" footer={<Continue step="cord" />}>
      <ActionContent step="cord" />
      <p className="
      compact-clinical-note py-2.5 px-[13px] m-0 gap-[9px] flex items-start rounded-[8px] bg-[#f9f5ed]
      text-[length:11px] leading-[1.6] text-[#7e6b49] [&_svg]:shrink-0 [&_svg]:mt-0.5 max-[699px]:text-[length:10px]
      max-[760px]:p-[7px] max-[760px]:text-[length:9px] max-[760px]:leading-[1.4]
    ">
        <Info size={16} />
        <span>
          <strong><TextType text="Clampaggio e milking:" /></strong>{' '}<TextType text="attendere almeno 60″ prima di clampare; considerare milking nei neonati depressi tra 35–42 settimane. Concorda con il team senza ritardare gli interventi necessari." />
        </span>
      </p>
    </StepFrame>
  );
}
