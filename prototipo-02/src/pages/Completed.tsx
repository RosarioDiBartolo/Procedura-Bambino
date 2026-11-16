import { Download } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { Illustration } from "../Illustration";
import { useSession } from "../SessionContext";
import { useProcedureRoute } from "../navigation";
import { exportSession } from "../exportSession";
export default function Completed() {
  const [session] = useSession();
  const { setPanel } = useProcedureRoute();
  return (
    <section className="compact-procedure" aria-label="Simulazione conclusa">
      <div className="compact-completion">
        <Illustration name="care" large />
        <h1>Simulazione conclusa</h1>
        <p>
          Il registro conserva i passaggi in questa scheda, anche dopo una
          ricarica della pagina.
        </p>
        <Button onClick={() => exportSession(session)}>
          <Download size={16} />
          Esporta il registro
        </Button>
        <Button variant="outline" onClick={() => setPanel("new")}>
          Avvia un’altra sessione
        </Button>
      </div>
    </section>
  );
}
