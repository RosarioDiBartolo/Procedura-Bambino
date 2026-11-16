import { getInterventions, type ActionPanel } from "./actionDetails";
import { steps, type StepId } from "./flow";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isInterventionPanel } from "./interventionDetails";
import type { Session } from "./flow";
export const panels = [
  "saturation",
  "mrsopa",
  "doppes",
  "poster",
  "help",
  "new",
  "limits",
  "navigation",
  "history",
  "counseling",
  "briefing",
  "equipment",
] as const;
export type Panel = (typeof panels)[number] | ActionPanel | null;
export const procedurePath = (step: string) => `/procedura/${step}`;
export const sessionPath = (session: Session) =>
  session.finishedAt !== null
    ? "/procedura/conclusa"
    : procedurePath(session.step);
// Only overlays use search parameters. Procedure navigation is explicit in useWorkflow.
export function useProcedureRoute() {
  const location = useLocation(),
    navigate = useNavigate();
  const requested = new URLSearchParams(location.search).get("panel");
  const routeStep = location.pathname.split("/").at(-1) ?? "";
  const isStep = Object.hasOwn(steps, routeStep);
  const validIntervention =
    isStep &&
    getInterventions(routeStep as StepId).some(
      (item) => item.panel === requested,
    );
  const panel: Panel = isInterventionPanel(requested)
    ? validIntervention
      ? requested
      : null
    : panels.includes(requested as (typeof panels)[number])
      ? (requested as Panel)
      : null;
  const search = panel ? `?panel=${panel}` : "";
  useEffect(() => {
    if (location.search !== search)
      navigate({ pathname: location.pathname, search }, { replace: true });
  }, [location.pathname, location.search, search, navigate]);
  const setPanel: Dispatch<SetStateAction<Panel>> = (value) => {
    const next = typeof value === "function" ? value(panel) : value;
    navigate(
      { pathname: location.pathname, search: next ? `?panel=${next}` : "" },
      { replace: next === null },
    );
  };
  return { panel, setPanel };
}
