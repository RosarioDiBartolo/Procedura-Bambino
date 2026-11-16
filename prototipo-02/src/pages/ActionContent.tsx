import { useState } from "react";
import { Button } from "@nls/ui/components/button";
import { steps, type StepId } from "../flow";
import { useSession } from "../SessionContext";
import { useWorkflow } from "../useWorkflow";
import { StepImage } from "../StepImage";
import { AnimatedInterventions } from "../Interventions";
export function ActionContent({ step }: { step: StepId }) {
  const [session] = useSession();
  const { checkAction } = useWorkflow();
  const [show, setShow] = useState(false);
  const current = steps[step];
  const actions = current.actions ?? [];
  const completed = actions.filter(
    (_, i) => session.checks[`${step}-${i}`],
  ).length;
  return (
    <div
      className={`compact-action-layout action-workspace ${actions.length > 4 ? "many-actions" : ""}`}
    >
      {actions.length < 4 && <aside className="action-context">
        <StepImage step={step} />
        <span>IL PASSAGGIO</span>
        <p>{current.subtitle}</p>
        <small>{current.source}</small>
      </aside>}
      <div className="compact-interventions">
        <div className="compact-list-heading">
          <strong>
            Interventi da eseguire{" "}
            <span className="action-count">{actions.length}</span>
          </strong>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={show}
            onClick={() => setShow((v) => !v)}
          >
            {show
              ? `Nascondi spunte (${completed}/${actions.length})`
              : "Registra interventi (facoltativo)"}
          </Button>
        </div>
        <AnimatedInterventions
          step={step}
          showChecklist={show}
          checks={session.checks}
          onCheck={(i, value) => checkAction(step, i, value)}
        />
      </div>
    </div>
  );
}
