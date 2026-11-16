import { useState, type ReactNode } from "react";
import { ArrowRight } from "@nls/ui/icons8";
import { decisionCases, selectCase, steps, type StepId } from "../flow";
import { useWorkflow } from "../useWorkflow";
import { Illustration } from "../Illustration";
import { UserPhoto } from "../UserPhotos";
export function DecisionContent({
  step,
  effective = false,
  children,
}: {
  step: StepId;
  effective?: boolean;
  children?: ReactNode;
}) {
  const { change } = useWorkflow();
  const [error, setError] = useState("");
  function choose(choice: "yes" | "no") {
    try {
      const next = selectCase(step, choice, effective);
      const item = decisionCases[step]!.find((c) => c.id === choice)!;
      change(next, `Caso selezionato: ${item.label} → ${steps[next].title}`, {
        selectedCase: choice,
        ...(step === "hr60" ? { effective } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="compact-decisions">
      <p className="compact-decision-instruction">
        Seleziona la situazione osservata dal team. Non occorre trascrivere i
        valori.
      </p>
      {children}
      <div className="case-grid">
        {decisionCases[step]?.map((c) => (
          <button
            type="button"
            className={`case-card case-${c.id}`}
            key={c.id}
            disabled={step === "hr60" && c.id === "yes" && !effective}
            onClick={() => choose(c.id)}
            aria-label={`${c.label}. ${c.destination}`}
          >
            <div className="case-art">
              {step === "initial" ? (
                <UserPhoto name={c.id === "yes" ? "newborn" : "birthCare"} />
              ) : c.art === "skin" ? (
                <UserPhoto name="skin" />
              ) : (
                <Illustration name={c.art} large />
              )}
              <span>{c.id === "yes" ? "CASO 1" : "CASO 2"}</span>
            </div>
            <strong>{c.label}</strong>
            <p>{c.detail}</p>
            {c.conditions && (
              <ul className="case-conditions">
                {c.conditions.map((condition) => (
                  <li key={condition}>
                    <span aria-hidden="true">{c.id === "yes" ? "✓" : "•"}</span>
                    {condition}
                  </li>
                ))}
              </ul>
            )}
            <div className="case-destination">
              {c.destination}
              <ArrowRight size={20} />
            </div>
          </button>
        ))}
      </div>
      {error && (
        <p className="compact-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
