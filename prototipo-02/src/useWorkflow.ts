import { startTransition } from 'react';
import { useNavigate } from "react-router-dom";
import { useSession } from "./SessionContext";
import {
  back,
  createSession,
  move,
  record,
  steps,
  type Answers,
  type Session,
  type StepId,
} from "./flow";
import { sessionPath } from "./navigation";
// Every domain transition records its data and explicitly navigates to the next route.
export function useWorkflow() {
  const [session, setSession] = useSession();
  const navigate = useNavigate();
  function commit(next: Session) {
    startTransition(() => {
      setSession(next);
      navigate(sessionPath(next), { replace: true });
    });
  }
  function change(next: StepId, text: string, answers?: Answers) {
    commit(move(session, next, Date.now(), text, answers));
  }
  function previous() {
    commit(back(session, Date.now()));
  }
  function birth() {
    const at = Date.now();
    commit(
      move(
        record(
          { ...session, birthAt: at },
          {
            at,
            step: "birth",
            type: "birth",
            text: "Nascita confermata ora nello scenario",
          },
        ),
        "cord",
        at,
        "Avvio della gestione del cordone",
      ),
    );
  }
  function finish() {
    const at = Date.now();
    commit(
      record(
        { ...session, finishedAt: at },
        {
          at,
          step: session.step,
          type: "end",
          text: "Simulazione conclusa dall’operatore",
        },
      ),
    );
  }
  function reset() {
    // Commit the new route and session at the same priority, so the route guard
    // never sees the old step with the freshly reset session.
    startTransition(() => {
      setSession(createSession(Math.max(Date.now(), session.startedAt + 1)));
      navigate('/', { replace: true });
    });
  }
  function checkAction(step: StepId, index: number, checked: boolean) {
    setSession((s) =>
      record(
        { ...s, checks: { ...s.checks, [`${step}-${index}`]: checked } },
        {
          at: Date.now(),
          step,
          type: "action",
          text: `${checked ? "Confermato" : "Deselezionato"}: ${steps[step].actions![index]}`,
        },
      ),
    );
  }
  return { change, previous, birth, finish, reset, checkAction };
}
