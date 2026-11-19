import TextType from '../components/ui/TextType';
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { steps, type StepId } from "../flow";
import { useSession } from "../SessionContext";
import { useWorkflow } from "../useWorkflow";
const shortTitles: Partial<Record<StepId, string>> = {
  initial: "Valutazione iniziale",
  preparation: "Preparazione",
  cord: "Gestione del cordone",
  skin: "Skin to skin e osservazione",
  "first-actions": "Primi interventi",
  "distress-support": "Supporto respiratorio",
  ppv: "Ventilazione a pressione positiva",
  correctives: "Correttivi della ventilazione",
  compressions: "Compressioni e ventilazione",
  medication: "Adrenalina e rivalutazione",
  post: "Cure successive e debriefing",
};

export function Continue({ step }: { step: StepId }) {
  const { change } = useWorkflow();
  const current = steps[step];
  return (
    <Button
      size="lg"
      onClick={() => change(current.next!, `Prosecuzione da: ${current.title}`)}
    >
      <TextType text="Prosegui" />
      <ArrowRight size={18} />
    </Button>
  );
}
export function StepFrame({
  step,
  children,
  footer,
}: {
  step: StepId;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [session] = useSession();
  const { previous } = useWorkflow();
  const heading = useRef<HTMLHeadingElement>(null);
  const current = steps[step];
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <section
      className={`
      compact-procedure [.step-presentation>&]:grow [.step-presentation>&]:shrink [.step-presentation>&]:basis-[0%]
      [.step-presentation>&]:flex [.step-presentation>&]:flex-col [.step-presentation>&]:h-full
      [.step-presentation>&]:min-h-0 p-6 gap-4 overflow-hidden [animation:none] w-full min-h-0 flex flex-col
      [box-shadow:0_4px_20px_#244d6505] h-full box-border grow-0 shrink-0 basis-auto min-w-0
      [@media(min-width:761px)_and_(max-height:780px)]:p-4.5 [@media(min-width:761px)_and_(max-height:780px)]:gap-2.5
      max-[760px]:p-3.5 max-[760px]:gap-2.5
    ${(current.actions?.length ?? 0) >= 4 ? `
      dense-procedure [.compact-procedure&]:flex [.compact-procedure&]:flex-col [.compact-procedure&]:max-h-full
      min-[700px]:[.compact-procedure&]:grid-rows-[auto_minmax(0,1fr)_auto]
    ` : ""}`}
      aria-label="Passaggio attuale"
      data-step={step}
      data-assistant-target={step}
    >
      <div className="
      compact-heading gap-5 [animation:none]! flex items-center justify-between shrink-0 [&_h1]:m-0
      [&_h1]:text-[length:clamp(22px,2.1cqw,32px)] [&_h1]:font-[650] [&_h1]:leading-[1.4] [&_h1]:tracking-[-.35px]
      [&_h1]:[outline:none] [&_h1]:text-[#23485d] [&>span]:text-[length:9px] [&>span]:tracking-[1.3px]
      [&>span]:text-[#6e8595] [&>span]:whitespace-nowrap max-[699px]:gap-2.5 max-[699px]:[&>span]:text-[length:7px]
      max-[699px]:[&>span]:tracking-[.6px] max-[760px]:[&_h1]:text-[length:20px]
    ">
        <h1 ref={heading} tabIndex={-1}>
          <TextType text={shortTitles[step] ?? current.question ?? current.title} />
        </h1>
        <span>
          {current.kind === "decision"
            ? "SELEZIONA IL CASO"
            : current.kind === "birth"
              ? "NASCITA"
              : "INTERVENTI"}
        </span>
      </div>
      {children}
      <footer className="
      compact-procedure-footer px-2.5 gap-4 [border-top:1px_solid_rgb(220,_231,_231)] mt-auto flex items-center
      justify-between pt-4 shrink-0 relative grow-0 basis-auto flex-nowrap min-h-17 pb-2 bg-[transparent] box-border
      [&_button]:m-0 [&_button]:gap-[9px] [&_button]:h-10.5 [&_button]:text-[length:12px] [&_button]:shrink-0
      [&>div]:gap-2 [&>div]:flex [&_small]:text-[length:10px] [&_small]:text-[#78909f]
      max-[699px]:[&>small]:text-[length:9px] max-[699px]:[&_button]:px-2.5 max-[699px]:[&_button]:text-[length:10px]
      max-[760px]:[&_button]:px-2 max-[760px]:[&_button]:text-[length:10px] [&>small]:min-w-0 [&>small]:text-right
      [@media(min-width:761px)_and_(max-height:780px)]:px-2
      [@media(min-width:761px)_and_(max-height:780px)]:min-h-14.5
      [@media(min-width:761px)_and_(max-height:780px)]:pt-2.5 [@media(min-width:761px)_and_(max-height:780px)]:pb-1.5
      max-[760px]:px-1 max-[760px]:gap-2 max-[760px]:pt-3 max-[760px]:pb-1.5 max-[760px]:min-h-14.5
    ">
        <Button
          variant="ghost"
          disabled={!session.stack.length}
          onClick={previous}
        >
          <ArrowLeft size={17} />
          <TextType text="Passo precedente" />
        </Button>
        {footer}
      </footer>
    </section>
  );
}
