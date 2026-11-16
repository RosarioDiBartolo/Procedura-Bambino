import { Download, ExternalLink, FileText, Maximize2, PhoneCall } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { Checkbox } from "@nls/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nls/ui/components/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@nls/ui/components/tabs";
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
        className={panel === "poster" ? "poster-dialog" : "reference-dialog"}
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
                        ? "Prototipo 02 · perimetro"
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
          <Tabs value={box} onValueChange={(value) => setPanel(value as Panel)}>
            <TabsList className="reference-tabs">
              <TabsTrigger value="saturation">01 · SpO₂</TabsTrigger>
              <TabsTrigger value="mrsopa">02 · MR SOPA</TabsTrigger>
              <TabsTrigger value="doppes">03 · DOPPES</TabsTrigger>
            </TabsList>
            <TabsContent value="saturation">
              <h3>Target SpO₂ preduttale dopo la nascita</h3>
              <p className="reference-intro">
                Confronta la saturazione preduttale con il tempo trascorso dalla
                nascita.
              </p>
              <table className="reference-table">
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
              <p className="reference-caution">
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
              <p className="reference-caution">
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
          <div className="poster-view">
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
            <div className="help-panel-note">
              <PhoneCall size={25} />
              <p>
                Attiva il sistema di chiamata previsto dalla struttura e
                condividi il passaggio attuale: <strong>{current.title}</strong>
                .
              </p>
            </div>
            <p className="reference-caution">
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
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => exportSession(session)}>
              <Download size={15} />
              Esporta registro
            </Button>
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
          <div className="limits-content">
            <p className="source-context">
              <strong>Riferimento del passaggio:</strong> {current.source}
            </p>
            <Button variant="outline" onClick={() => setPanel("poster")}>
              Consulta il documento originale
            </Button>
            <p>
              <strong>
                Nuovo prototipo React, indipendente dal prototipo 01.
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
          <nav className="compact-navigation" aria-label="Fasi della procedura">
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
          <div className="compact-history">
            {!session.events.length ? (
              <p>Nessun evento registrato.</p>
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
                    <span>{e.text}</span>
                  </li>
                ))}
              </ol>
            )}
            <Button
              variant="outline"
              disabled={!session.events.length}
              onClick={() => exportSession(session)}
            >
              <Download size={16} />
              Esporta JSON
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
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
        <label key={`${prefix}-${i}`}>
          <Illustration name={artFor(text)} />
          <span className="mnemonic-letter">{letter}</span>
          <span>{text}</span>
          <Checkbox
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
        </label>
      ))}
    </div>
  );
}
