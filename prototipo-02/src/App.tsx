import { useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import { Activity, ClipboardList, Clock3, FileText, Menu, PhoneCall, RotateCcw, Thermometer, Volume2 } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { formatTime, phases, secondsFrom, steps, type StepId } from "./flow";
import { useSession } from "./SessionContext";
import { useProcedureRoute } from "./navigation";
import { VoiceGuide } from "./VoiceGuide";
import { SessionPanels } from "./SessionPanels";
import { useNow } from "./useNow";
import "./App.css";
import "./compact.css";
export default function App() {
  const [session] = useSession();
  const match = useMatch("/procedura/:step");
  const routeStep = match?.params.step as StepId;
  const current = steps[routeStep] ?? steps[session.step];
  const { panel, setPanel } = useProcedureRoute();
  const [showVoice, setShowVoice] = useState(false);
  const now = useNow();
  const born = secondsFrom(session.birthAt, session.finishedAt ?? now);
  const helpRequested = session.events.some((e) => e.type === "help");
  const openBox = setPanel;
  return (
    <div className="app-shell compact-shell">
      <div className="prototype-ribbon">
        PROTOTIPO 02 · SIMULAZIONE · NON VALIDATO PER USO ASSISTENZIALE
      </div>
      <header className="compact-header">
        <Button
          variant="outline"
          className="navigation-toggle"
          onClick={() => setPanel("navigation")}
          aria-expanded={panel === "navigation"}
        >
          <Menu size={19} />
          Percorso <span>{current.phase + 1}/6</span>
        </Button>
        <div className="compact-identity">
          <Activity size={20} />
          <strong>
            NLS <span>Assistente di procedura</span>
          </strong>
        </div>
        <div className="compact-header-tools">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPanel("limits")}
            aria-label="Protocollo e fonti"
          >
            <FileText size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPanel("history")}
            aria-label="Registro della sessione"
          >
            <ClipboardList size={18} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPanel("new")}
            aria-label="Nuova sessione"
          >
            <RotateCcw size={18} />
          </Button>
        </div>
      </header>
      <div className="compact-status">
        <span>{phases[current.phase]}</span>
        <span>
          <Thermometer size={15} />
          36,5–37,5 °C
        </span>
        <span className="compact-timer">
          <Clock3 size={16} />
          Dalla nascita <strong>{formatTime(born)}</strong>
        </span>
      </div>
      <main className="compact-main">
        <Outlet />
      </main>
      <div className="compact-utility-bar">
        <div>
          <Button variant="outline" onClick={() => openBox("saturation")}>
            Target SpO₂
          </Button>
          <Button
            variant={current.box === "mrsopa" ? "default" : "outline"}
            onClick={() => openBox("mrsopa")}
          >
            MR SOPA
          </Button>
          <Button
            variant={current.box === "doppes" ? "default" : "outline"}
            onClick={() => openBox("doppes")}
          >
            DOPPES
          </Button>
        </div>
        <div>
          <Button
            variant="ghost"
            aria-expanded={showVoice}
            onClick={() => setShowVoice((v) => !v)}
          >
            <Volume2 size={17} />
            <span>Guida vocale</span>
          </Button>
          <Button className="compact-help" onClick={() => setPanel("help")}>
            <PhoneCall size={17} />
            {helpRequested ? "Aiuto segnalato" : "Richiedere aiuto"}
          </Button>
        </div>
      </div>
      <div className={`voice-popover ${showVoice ? "is-open" : ""}`}>
        <Button
          className="voice-close"
          variant="ghost"
          onClick={() => setShowVoice(false)}
        >
          Chiudi guida
        </Button>
        <VoiceGuide
          step={current}
          finished={session.finishedAt !== null}
          sessionKey={session.startedAt}
          blocked={panel !== null}
        />
      </div>
      <SessionPanels />
    </div>
  );
}
