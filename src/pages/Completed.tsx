import TextType from '../components/ui/TextType';
import { Download } from "@/components/icons8";
import { Button } from "@/components/ui/button";
import { Illustration } from "../Illustration";
import { useSession } from "../SessionContext";
import { useProcedureRoute } from "../navigation";
import { exportReport } from "../sessionReport";
import { exportSession } from "../exportSession";
export default function Completed() {
  const [session] = useSession();
  const { setPanel } = useProcedureRoute();
  return (
    <section className="
      compact-procedure [.step-presentation>&]:grow [.step-presentation>&]:shrink [.step-presentation>&]:basis-[0%]
      [.step-presentation>&]:flex [.step-presentation>&]:flex-col [.step-presentation>&]:h-full
      [.step-presentation>&]:min-h-0 p-6 gap-4 overflow-hidden [animation:none] w-full min-h-0 flex flex-col
      [box-shadow:0_4px_20px_#244d6505] h-full box-border grow-0 shrink-0 basis-auto min-w-0
      [@media(min-width:761px)_and_(max-height:780px)]:p-4.5 [@media(min-width:761px)_and_(max-height:780px)]:gap-2.5
      max-[760px]:p-3.5 max-[760px]:gap-2.5
    " aria-label="Simulazione conclusa">
      <div className="
      compact-completion m-auto text-center [&_h2]:text-[length:24px] [&_p]:mx-0 [&_p]:text-[length:13px]
      [&_p]:text-[#78909c] [&_p]:mt-3 [&_p]:mb-6 [&_button]:m-[5px]
    ">
        <Illustration name="care" large />
        <h1><TextType text="Simulazione conclusa" /></h1>
        <p>
          <TextType text="Il registro conserva i passaggi in questa scheda, anche dopo una ricarica della pagina." />
        </p>
        <Button onClick={() => exportReport(session)}>
          <Download size={16} />
          Scarica report
        </Button>
        <Button variant="outline" onClick={() => exportSession(session)}>Esporta JSON</Button>
        <Button variant="outline" onClick={() => setPanel("new")}>
          Avvia un’altra sessione
        </Button>
      </div>
    </section>
  );
}
