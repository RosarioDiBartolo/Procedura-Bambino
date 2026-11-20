import { Download, ExternalLink, FileText, Maximize2, PhoneCall } from "@/components/icons8";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  doppes,
  mrsopa,
  phases,
  record,
  saturation,
  steps,
  type Session,
} from "./flow";
import { Illustration, artFor } from "./Illustration";
import { isInterventionPanel } from "./interventionDetails";
import { useSession } from "./SessionContext";
import { useProcedureRoute, type Panel } from "./navigation";
import { useWorkflow } from "./useWorkflow";
import { exportReport } from "./sessionReport";
import { exportSession } from "./exportSession";
export function SessionPanels() {
  const [session, setSession] = useSession();
  const { panel, setPanel } = useProcedureRoute();
  const { reset } = useWorkflow();
  const current = steps[session.step];
  const box = panel === "mrsopa" || panel === "doppes" ? panel : "saturation";
  return (
    <Dialog
      open={panel !== null && !isInterventionPanel(panel)}
      onOpenChange={(open) => {
        if (!open) {
          setPanel(null);
        }
      }}
    >
      <DialogContent
        className={panel === "poster" ? "w-[min(90vw,1050px)]! max-w-[1050px]! max-h-[94vh] overflow-y-auto max-[650px]:p-4.5! max-[650px]:w-[95vw]!" : `
      reference-dialog p-[27px]! max-w-[570px]! max-h-[90vh] overflow-y-auto
      [&_[data-slot=dialog-title]]:text-[length:19px] [&_[data-slot=dialog-title]]:tracking-[-.4px]
      [&_[data-slot=dialog-title]]:text-[#29485f] [&_[data-slot=dialog-description]]:text-[length:11px]
      [&_[data-slot=dialog-description]]:leading-[1.8] [&_[data-slot=dialog-description]]:text-[#8ba0af] [&_h3]:mx-0
      [&_h3]:text-[length:14px] [&_h3]:font-[600] [&_h3]:text-[#48667c] [&_h3]:mt-0 [&_h3]:mb-3 max-[650px]:p-[23px]!
    `}
      >
        <DialogHeader>
          <DialogTitle>
            {panel === "poster"
              ? "Diagramma originale · SIN 2025"
              : panel === "help"
                ? "Aiuto e coordinamento del team"
                : panel === "new"
                  ? "Iniziare una nuova sessione?"
                  : panel === "navigation"
                    ? "Percorso operativo"
                    : panel === "history"
                      ? "Registro della sessione"
                      : panel === "limits"
                        ? "Nido · perimetro"
                        : "Supporti operativi"}
          </DialogTitle>
          <DialogDescription>
            {panel === "poster"
              ? "Il riferimento visivo del percorso, disponibile senza lasciare la sessione."
              : panel === "new"
                ? "Il registro corrente sarà cancellato. Puoi esportarlo prima di proseguire."
                : "Contenuti per simulazione e presentazione. Le valutazioni restano al team."}
          </DialogDescription>
        </DialogHeader>
        {["saturation", "mrsopa", "doppes"].includes(panel ?? "") && (
          <Tabs className="support-tabs" value={box} onValueChange={(value) => setPanel(value as Panel)}>
            <TabsList className="mx-0 w-full mt-3 mb-[23px] [&_button]:grow [&_button]:shrink [&_button]:basis-[0%] [&_button]:text-[length:11px]">
              <TabsTrigger value="saturation">01 · SpO₂</TabsTrigger>
              <TabsTrigger value="mrsopa">02 · MR SOPA</TabsTrigger>
              <TabsTrigger value="doppes">03 · DOPPES</TabsTrigger>
            </TabsList>
            <TabsContent value="saturation">
              <h3>Target SpO₂ preduttale dopo la nascita</h3>
              <p className="text-[length:11px] text-[#899caa] leading-[1.8]">
                Confronta la saturazione preduttale con il tempo trascorso dalla
                nascita.
              </p>
              <table className="
      w-full border-collapse text-[length:13px] mt-4.5 [&_td]:p-[13px]
      [&_td]:[border-bottom:1px_solid_rgb(231,_237,_242)] [&_td]:text-left [&_th]:p-[13px]
      [&_th]:[border-bottom:1px_solid_rgb(231,_237,_242)] [&_th]:text-left [&_th]:text-[length:10px]
      [&_th]:text-[#91a0ae] [&_th]:bg-[#f5f8fb] [&_th]:font-[600] [&_td:last-child]:font-[600]
      [&_td:last-child]:text-[#42667e]
    ">
                <thead>
                  <tr>
                    <th>Tempo dopo la nascita</th>
                    <th>Target SpO₂</th>
                  </tr>
                </thead>
                <tbody>
                  {saturation.map(([t, v]) => (
                    <tr key={t}>
                      <td>{t}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-3 text-[length:10px] leading-[1.8] bg-[#f7f4ee] text-[#9b896d] rounded-[7px] mt-5">
                Questi target dei primi minuti non sono target universali per il
                neonato già ricoverato in UTIN.
              </p>
            </TabsContent>
            <TabsContent value="mrsopa">
              <h3>Correttivi della ventilazione in maschera</h3>
              <ReferenceChecklist
                items={mrsopa}
                prefix="mrsopa"
                session={session}
                setSession={setSession}
              />
              <p className="p-3 text-[length:10px] leading-[1.8] bg-[#f7f4ee] text-[#9b896d] rounded-[7px] mt-5">
                Rimuovi le secrezioni solo se necessario. Verifica la risposta
                della ventilazione dopo ogni correzione.
              </p>
            </TabsContent>
            <TabsContent value="doppes">
              <h3>Rivalutazione della ventilazione nell’intubato</h3>
              <ReferenceChecklist
                items={doppes}
                prefix="doppes"
                session={session}
                setSession={setSession}
              />
            </TabsContent>
          </Tabs>
        )}
        {panel === "poster" && (
          <div className="
      [&>a]:mx-0 [&>a]:gap-[7px] [&>a]:flex [&>a]:items-center [&>a]:text-[length:11px] [&>a]:text-[#698ba4]
      [&>a]:mt-2 [&>a]:mb-5 [&_img]:border [&_img]:border-solid [&_img]:border-[rgb(221,_229,_236)] [&_img]:w-full
      [&_img]:rounded-[6px]
    ">
            <a
              href="sources/poster-sin-2025.pdf"
              target="_blank"
              rel="noopener"
            >
              Apri PDF in un’altra scheda
              <Maximize2 size={14} />
            </a>
            <img
              src="sources/poster.png"
              alt="Algoritmo di rianimazione neonatale SIN, update 2025, con flow-chart, messaggi chiave e tre box di approfondimento"
            />
          </div>
        )}
        {panel === "help" && (
          <>
            <div className="
      p-5 gap-[15px] flex items-start bg-[#f4f7f9] rounded-[10px] text-[#8299ab] [&_svg]:shrink-0 [&_p]:m-0
      [&_p]:text-[length:12px] [&_p]:leading-[1.8] [&_p]:text-[#637e92]
      [.reference-dialog>&~button]:text-[length:11px] [.reference-dialog>&~button]:mt-2.5
    ">
              <PhoneCall size={25} />
              <p>
                Attiva il sistema di chiamata previsto dalla struttura e
                condividi il passaggio attuale: <strong>{current.title}</strong>
                .
              </p>
            </div>
            <p className="p-3 text-[length:10px] leading-[1.8] bg-[#f7f4ee] text-[#9b896d] rounded-[7px] mt-5">
              Nessuna chiamata viene effettuata dall’app.
            </p>
            <Button
              onClick={() => {
                setSession((s) =>
                  record(s, {
                    at: Date.now(),
                    step: s.step,
                    type: "help",
                    text: "Richiesta di aiuto confermata come effettuata nello scenario",
                  }),
                );
                setPanel(null);
              }}
            >
              Confermo richiesta effettuata nello scenario
            </Button>
          </>
        )}
        {panel === "new" && (
          <div className="gap-3 flex flex-wrap justify-between mt-[15px] [&_button]:text-[length:11px]">
            <Button variant="outline" onClick={() => exportReport(session)}>
              <Download size={15} />
              Scarica report
            </Button>
            <Button variant="outline" onClick={() => exportSession(session)}>Esporta JSON</Button>
            <Button
              variant="destructive"
              onClick={() => {
                reset();
              }}
            >
              Azzera e ricomincia
            </Button>
          </div>
        )}
        {panel === "limits" && (
          <div className="
      text-[length:12px] text-[#7990a2] leading-[1.9] [&_ul]:my-[15px] [&_ul]:mx-0 [&_ul]:[list-style:disc]
      [&_ul]:pl-4.5 [&_li]:my-[9px] [&_li]:mx-0 [&_a]:gap-2 [&_a]:flex [&_a]:items-center [&_a]:text-[#3d6b8c]
    ">
            <p className="source-context">
              <strong>Riferimento del passaggio:</strong> {current.source}
            </p>
            <Button variant="outline" className="my-4 min-h-11 gap-2.5 px-4 py-2.5" onClick={() => setPanel("poster")}>
              <FileText size={18} className="shrink-0" />
              Consulta il documento originale
            </Button>
            <p>
              <strong>
                Nido · applicazione React per simulazione.
              </strong>{" "}
              Il percorso riproduce i nodi e i box del poster SIN 2025; non è
              una trasposizione di tutte le linee guida.
            </p>
            <ul>
              <li>
                Solo dati fittizi. Nessuna validazione per uso assistenziale.
              </li>
              <li>Timer informativi: nessun avanzamento automatico.</li>
              <li>
                Selezione dei casi osservati dal team; nessuna trascrizione dei
                parametri e nessuna lettura dei monitor.
              </li>
              <li>
                Il ramo NO dopo FC &lt;60/min del supporto avanzato non è
                tracciato nel poster: viene evidenziato, senza inventarlo.
              </li>
              <li>
                Dosi, criteri tecnici e decisioni non riportate nel diagramma
                non sono aggiunte come se ne facessero parte.
              </li>
              <li>
                Registro temporaneo nella scheda corrente, ripristinato alla
                ricarica; esportazione manuale. Se lo spazio locale non è
                disponibile, resta solo in memoria.
              </li>
              <li>
                Il poster riguarda la rianimazione alla nascita: applicabilità a
                contesti successivi da verificare.
              </li>
            </ul>
            <a
              href="sources/poster-sin-2025.pdf"
              target="_blank"
              rel="noopener"
            >
              Fonte: poster originale SIN 2025
              <ExternalLink size={13} />
            </a>
            <a href="https://icons8.com/" target="_blank" rel="noreferrer">
              Icone di Icons8
              <ExternalLink size={13} />
            </a>
          </div>
        )}

        {panel === "navigation" && (
          <nav className="
      gap-2 grid [&>div]:p-3.5 [&>div]:gap-3 [&>div]:border [&>div]:border-solid [&>div]:border-[rgb(224,_232,_237)]
      [&>div]:flex [&>div]:items-center [&>div]:rounded-[9px] [&>div]:text-[length:13px] [&>div]:text-[#758c9b]
      [&>div>span]:grid [&>div>span]:place-items-center [&>div>span]:bg-[#edf2f6] [&>div>span]:rounded-[7px]
      [&>div>span]:w-7.5 [&>div>span]:h-7.5 [&>div>span]:text-[length:12px] [&_[aria-current=step]]:border-[#9abccc]
      [&_[aria-current=step]]:bg-[#edf5f8] [&_[aria-current=step]]:text-[#244f68] [&_small]:ml-auto
      [&_small]:text-[length:10px] [&>p]:text-[length:11px] [&>p]:text-[#8195a1]
    " aria-label="Fasi della procedura">
            {phases.map((name, i) => (
              <div
                key={name}
                aria-current={i === current.phase ? "step" : undefined}
              >
                <span>{i + 1}</span>
                <strong>{name}</strong>
                {i === current.phase && <small>In corso</small>}
              </div>
            ))}
            <p>Il percorso si aggiorna in base ai casi selezionati.</p>
          </nav>
        )}
        {panel === "history" && (
          <div className="
      mt-2 space-y-5
      [&>ol]:p-0 [&>ol]:mx-0 [&>ol]:overflow-auto [&>ol]:list-none [&>ol]:max-h-[55vh] [&>ol]:mt-0 [&>ol]:mb-[15px]
      [&_li]:py-3 [&_li]:px-0 [&_li]:gap-2.5 [&_li]:[border-bottom:1px_solid_rgb(230,_237,_241)] [&_li]:grid
      [&_li]:grid-cols-[62px_1fr] [&_li]:text-[length:11px] [&_li]:leading-[1.6] [&_time]:text-[#8598a4]
    ">
            {!session.events.length ? (
              <div className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 px-5 py-6 text-center">
                <FileText size={22} className="text-muted-foreground/60" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Nessun evento registrato.</p>
              </div>
            ) : (
              <ol>
                {[...session.events].reverse().map((e) => (
                  <li key={e.id}>
                    <time>
                      {new Date(e.at).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </time>
                    <span>{e.from && e.to && <strong>{steps[e.from].title} → {steps[e.to].title}<br /></strong>}{e.text}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button onClick={() => exportReport(session)}><Download size={16} />Scarica report</Button>
              <Button
                variant="outline"
                disabled={!session.events.length}
                onClick={() => exportSession(session)}
              >
                <Download size={16} />
                Esporta JSON
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
const referenceTitles: Record<string, string[]> = {
  mrsopa: ['Maschera', 'Posizione', 'Secrezioni', 'Bocca', 'Pressioni', 'Via aerea'],
  doppes: ['Posizione del tubo', 'Pervietà', 'Ventilazione', 'Pneumotorace', 'Strumentazione', 'Stomaco'],
};
function ReferenceChecklist({
  items,
  prefix,
  session,
  setSession,
}: {
  items: string[][];
  prefix: string;
  session: Session;
  setSession: React.Dispatch<React.SetStateAction<Session>>;
}) {
  return (
    <div className="reference-checklist">
      {items.map(([letter, text], i) => (
        <label className="reference-check-row" key={`${prefix}-${i}`}>
          <Checkbox
            aria-label={`${letter} · ${text}`}
            aria-describedby={`${prefix}-${i}-description`}
            checked={!!session.checks[`${prefix}-${i}`]}
            onCheckedChange={(value) =>
              setSession((s) =>
                record(
                  {
                    ...s,
                    checks: { ...s.checks, [`${prefix}-${i}`]: value === true },
                  },
                  {
                    at: Date.now(),
                    step: s.step,
                    type: "action",
                    text: `${prefix.toUpperCase()} · ${value === true ? "verificato" : "deselezionato"}: ${text}`,
                  },
                ),
              )
            }
          />
          <span className="reference-check-copy">
            <strong>{letter} · {referenceTitles[prefix]?.[i] ?? text}</strong>
            <span id={`${prefix}-${i}-description`}>{text}</span>
          </span>
          <span className="reference-check-icon"><Illustration name={artFor(text)} /></span>
        </label>
      ))}
    </div>
  );
}
