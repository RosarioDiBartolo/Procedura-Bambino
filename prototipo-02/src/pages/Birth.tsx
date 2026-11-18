import TextType from '../components/ui/TextType';
import { ArrowRight } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { StepFrame } from "./StepFrame";
import { StepImage } from "../StepImage";
import { useWorkflow } from "../useWorkflow";
export default function Birth() {
  const { birth } = useWorkflow();
  return (
    <StepFrame step="birth">
      <div className="
      compact-birth py-2.5 gap-7 [animation:none]! grid grid-cols-[minmax(0,1.25fr)_minmax(0,.85fr)] items-center
      grow-0 shrink-0 basis-auto min-h-0 [&>div>strong]:text-[length:clamp(25px,3.1cqw,40px)] [&_p]:mx-0
      [&_p]:text-[length:14px] [&_p]:leading-[1.7] [&_p]:text-[#698291] [&_p]:mt-[15px] [&_p]:mb-5.5 [&_button]:gap-5
      [&_button]:h-13.5 [&_small]:block [&_small]:text-[length:10px] [&_small]:text-[#8396a2] [&_small]:mt-4
      [&_small]:leading-[1.6] max-[699px]:[&_p]:text-[length:12px] [&>div]:py-4 [&>div]:px-0 [&>div]:[grid-column:1]
      [&>div]:[grid-row:1] [&>div]:self-center [.compact-procedure>&]:p-0 [.compact-procedure>&]:overflow-hidden
      [.compact-procedure>&]:grid [.compact-procedure>&]:grow [.compact-procedure>&]:shrink
      [.compact-procedure>&]:basis-[0%] [.compact-procedure>&]:min-h-0 [.compact-procedure>&]:h-auto
      [.compact-procedure>&]:grid-rows-[minmax(0,1fr)] [.compact-procedure>&]:items-center max-[760px]:[&>div]:py-2
      max-[760px]:[&>div]:px-0
    ">
        <StepImage step="birth" />
        <div>
          <strong><TextType text="Conferma la nascita" /></strong>
          <p>
            <TextType text="Avvia il riferimento temporale quando avviene la nascita nello scenario." />
          </p>
          <Button size="lg" onClick={birth}>
            Nascita ora · prosegui
            <ArrowRight size={18} />
          </Button>
          <small>
            <TextType text="Il tempo non è avviato automaticamente. Nessun parametro da trascrivere." />
          </small>
        </div>
      </div>
    </StepFrame>
  );
}
