import { AppearanceContext } from './components/ui/AppearanceContext';
import AnimatedContent from './components/ui/AnimatedContent';
import { RecordedVoice } from './RecordedVoice';
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import { Activity, ClipboardList, Clock3, FileText, OxygenMask, PhoneCall, RotateCcw, Thermometer, Lungs } from "@/components/icons8";
import { Button } from "@/components/ui/button";
import { formatTime, phases, secondsFrom, steps, type StepId } from "./flow";
import { useSession } from "./SessionContext";
import { useProcedureRoute } from "./navigation";

import { SessionPanels } from "./SessionPanels";
import { useNow } from "./useNow";
function StepPresentation({ visit, seen, children }: { visit: string; seen: Set<string>; children: ReactNode }) {
  const [animate] = useState(() => !seen.has(visit));
  useLayoutEffect(() => { seen.add(visit); }, [seen, visit]);
  return <AppearanceContext.Provider value={{ sequential: true, enabled: animate, replayKey: visit }}><AnimatedContent sequentialText enabled={animate} replayKey={visit} distance={0} targets=".compact-heading, .compact-list-heading, .compact-action-list>li, .step-photo-frame, .case-card, .compact-decision-instruction, .compact-clinical-note, .compact-medication, .compact-procedure-footer, .compact-birth>.compact-step-image, .compact-birth>div, .compact-completion" className="step-presentation min-h-0 flex flex-col h-full overflow-hidden">{children}</AnimatedContent></AppearanceContext.Provider>;
}
export default function App() {
  const seenSteps = useRef(new Set<string>());
  const location = useLocation();
  const [session] = useSession();
  const match = useMatch("/procedura/:step");
  const routeStep = match?.params.step as StepId;
  const current = steps[routeStep] ?? steps[session.step];
  const { setPanel } = useProcedureRoute();
  const now = useNow();
  const born = secondsFrom(session.birthAt, session.finishedAt ?? now);
  const helpRequested = session.events.some((e) => e.type === "help");

  return (
    <div className={`
      app-shell compact-shell relative overflow-x-hidden grid-rows-[auto_minmax(0,1fr)_auto]
      min-h-0 flex-1 grid bg-[#f0f4f7] text-[#203c50]
      max-[760px]:grid-rows-[auto_minmax(0,1fr)_auto]
    `}>
      <div role="group" aria-label="Stato e comandi della simulazione" className="
      [.assistant-home_&]:[animation:reveal-chrome_.8s_1.6s_both] py-3 px-6
      [border-bottom:1px_solid_rgb(220,_229,_235)] min-h-19 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-y-3 gap-x-6
      items-center justify-between bg-[#fff] max-[1100px]:py-3 max-[1100px]:px-4.5 max-[1100px]:gap-2.5
      max-[760px]:py-2.5 max-[760px]:px-3 max-[760px]:gap-2 max-[760px]:grid-cols-[1fr_auto]
    ">
        <div className="min-w-0 max-[580px]:col-span-2">
          <p className="mt-1 text-[11px] text-[#49677b]">Procedura NLS · Simulazione didattica per l’UTIN</p>
        </div>
        <div className="gap-[7px] [grid-column:3] [grid-row:1] flex max-[760px]:[grid-column:2] max-[580px]:[grid-row:2] [&_button]:p-2 [&_button]:w-[37px] [&_button]:h-[37px] max-[699px]:gap-[3px]">
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
      <div className="
      compact-status [.assistant-home_&]:visible p-0 gap-5 border-0 border-none border-[currentColor] [grid-column:2]
      [grid-row:1] [background:none] justify-center flex items-center text-[length:11px] text-[#49677b]
      [&>span:first-child]:max-w-none [&>span:first-child]:font-[650] [&>span:first-child]:text-[#244d65]
      max-[1100px]:gap-3 max-[1100px]:text-[length:10px] max-[760px]:py-0.5 max-[760px]:px-0
      max-[760px]:[grid-column:1/3] max-[760px]:[grid-row:2] max-[760px]:justify-between max-[760px]:flex-wrap
      max-[580px]:[grid-column:1] max-[580px]:[&_span]:!ml-0
      [&>span]:gap-[7px] [&>span]:flex [&>span]:items-center max-[699px]:text-[length:9px] max-[699px]:flex-wrap
    ">
        <span>{phases[current.phase]}</span>
        <span>
          <Thermometer size={15} />
          36,5–37,5 °C
        </span>
        <span className="
      ml-auto [&_strong]:text-[length:19px] [&_strong]:tabular-nums [&_strong]:text-[#224c64] [&_strong]:min-w-14.5
      max-[699px]:gap-[5px]! max-[699px]:[&_strong]:text-[length:15px] max-[699px]:[&_strong]:min-w-11.5
    ">
          <Clock3 size={16} />
          Dalla nascita <strong>{formatTime(born)}</strong>
        </span>
      </div>
      </div>
      <main className={`
      compact-main workspace-main relative py-4.5 px-6 my-0 mx-auto overflow-hidden
      max-w-none min-h-0 w-full min-w-0 max-[1100px]:pl-4.5 max-[760px]:p-2.5
    `}>
        <div className="min-w-0 min-h-0 h-full overflow-hidden p-[3px] [container-type:inline-size]"><StepPresentation key={`${session.startedAt}:${location.pathname}`} seen={seenSteps.current} visit={`${session.startedAt}:${location.pathname}`}><Outlet /></StepPresentation></div>
      </main>
      <footer className="flex flex-wrap items-start gap-x-6 gap-y-3.5 border-t border-chrome-edge bg-chrome px-6 pt-3 pb-2 max-[1000px]:gap-x-4 max-[1000px]:gap-y-3 max-[1000px]:px-[18px] max-[600px]:gap-2 max-[600px]:px-3 max-[600px]:py-2 [&_button]:h-[38px] [&_button]:gap-1.5 [&_button]:px-[11px] [&_button]:text-[11px] max-[600px]:[&_button]:h-8 max-[600px]:[&_button]:text-[10px] [&_[role=status]]:text-chrome-foreground [&_button[data-variant=outline]]:border-chrome-action [&_button[data-variant=outline]]:bg-chrome-action [&_button[data-variant=outline]]:text-chrome-action-foreground [&_button[data-variant=outline]:enabled:hover]:border-chrome-action-hover [&_button[data-variant=outline]:enabled:hover]:bg-chrome-action-hover">
        <div role="group" aria-label="Promemoria" className="max-[600px]:basis-full">
          <span className="mb-[7px] block text-[10px] font-semibold text-chrome-foreground max-[600px]:mb-1">Promemoria</span>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" onClick={() => setPanel('mrsopa')}><OxygenMask size={18} />MR SOPA</Button>
            <Button variant="outline" onClick={() => setPanel('doppes')}><Lungs size={18} />DOPPES</Button>
            <Button variant="outline" onClick={() => setPanel('saturation')}><Activity size={18} />Target SpO₂</Button>
          </div>
        </div>
        <div className="flex-1 border-l border-chrome-divider pl-6 max-[1000px]:pl-4 max-[600px]:basis-full max-[600px]:border-t max-[600px]:border-l-0 max-[600px]:pt-2 max-[600px]:pl-0"><span className="mb-[7px] block text-[10px] font-semibold text-chrome-foreground max-[600px]:mb-1">Guida vocale</span>
          <RecordedVoice clip={session.finishedAt ? 'finished' : session.step} visit={`${session.startedAt}:${session.enteredAt}:${session.stack.length}:${session.step}`} />
        </div>
        <div className="ml-auto max-[1000px]:flex max-[1000px]:basis-full max-[1000px]:items-center max-[1000px]:justify-between max-[1000px]:[&>span]:mb-0"><span className="mb-[7px] block text-[10px] font-semibold text-chrome-foreground max-[600px]:mb-1">Coordinamento · simulazione</span>
          <Button className="bg-chrome-help text-chrome-white hover:bg-chrome-help-hover" onClick={() => setPanel('help')}><PhoneCall size={17} />{helpRequested ? 'Aiuto segnalato' : 'Richiedere aiuto'}</Button>
        </div>
      </footer>

      <SessionPanels />
    </div>
  );
}
