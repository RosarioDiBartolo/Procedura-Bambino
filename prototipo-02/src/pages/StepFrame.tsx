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
      Prosegui
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
    heading.current?.focus();
  }, [step]);
  return (
    <section
      className={`compact-procedure ${(current.actions?.length ?? 0) >= 4 ? "dense-procedure" : ""}`}
      aria-label="Passaggio attuale"
      data-step={step}
    >
      <div className="compact-heading">
        <h1 ref={heading} tabIndex={-1}>
          {shortTitles[step] ?? current.question ?? current.title}
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
      <footer className="compact-procedure-footer">
        <Button
          variant="ghost"
          disabled={!session.stack.length}
          onClick={previous}
        >
          <ArrowLeft size={17} />
          Passo precedente
        </Button>
        {footer}
      </footer>
    </section>
  );
}
