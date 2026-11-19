import { AppearanceContext } from './components/ui/AppearanceContext';
import AnimatedContent from './components/ui/AnimatedContent';
import { RecordedVoice } from './RecordedVoice';
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import { ClipboardList, Clock3, FileText, PhoneCall, RotateCcw, Thermometer } from "@/components/icons8";
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
      app-shell compact-shell relative overflow-x-hidden grid-rows-[24px_auto_minmax(0,1fr)_auto] h-[100dvh]
      min-h-160 grid bg-[#f0f4f7] text-[#203c50] max-[760px]:h-[100dvh] max-[760px]:min-h-0
      max-[760px]:grid-rows-[22px_auto_minmax(0,1fr)_auto] [@media(min-width:700px)_and_(max-height:740px)]:min-h-150
    `}>
      <div className="
      [.assistant-home_&]:[animation:reveal-chrome_.8s_1.6s_both] gap-2 [border-bottom:1px_solid_rgb(223,_229,_236)]
      h-[29px] bg-[#edf1f5] text-[#637386] flex items-center justify-center text-[length:10px] tracking-[1.3px]
      font-[700] max-[650px]:h-6.5 max-[650px]:text-[length:8px] [.compact-shell_&]:h-6
      [.compact-shell_&]:text-[length:9px] [.compact-shell_&]:tracking-[1px]
      [@media(min-width:700px)_and_(max-height:740px)]:[.compact-shell_&]:h-5
      [@media(min-width:700px)_and_(max-height:740px)]:[.compact-shell_&]:text-[length:8px]
    ">
        NIDO · SIMULAZIONE · NON VALIDATO PER USO ASSISTENZIALE
      </div>
      <header className="
      [.assistant-home_&]:[animation:reveal-chrome_.8s_1.6s_both] py-3 px-6
      [border-bottom:1px_solid_rgb(220,_229,_235)] min-h-19 grid grid-cols-[auto_1fr_auto] gap-y-3 gap-x-6
      items-center justify-between bg-[#fff] max-[1100px]:py-3 max-[1100px]:px-4.5 max-[1100px]:gap-2.5
      max-[760px]:py-2.5 max-[760px]:px-3 max-[760px]:gap-2 max-[760px]:grid-cols-[1fr_auto]
    ">
        <div className="
      compact-identity gap-2.5 whitespace-nowrap flex items-center max-[1100px]:[&_strong>span]:hidden
      max-[760px]:flex [&_strong]:text-[length:17px] [&_strong>span]:text-[length:12px] [&_strong>span]:font-[400]
      [&_strong>span]:text-[#718494] [&_strong>span]:ml-2.5
      [@media(min-width:700px)_and_(max-width:950px)]:[&_strong>span]:hidden
    ">
          <img className="block h-10.5 w-31 object-contain max-[760px]:h-9 max-[760px]:w-26" src="/brand/nido-logo.png" alt="Nido" />
        </div>
        <div className="gap-[7px] [grid-column:3] [grid-row:1] flex max-[760px]:[grid-column:2] [&_button]:p-2 [&_button]:w-[37px] [&_button]:h-[37px] max-[699px]:gap-[3px]">
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
      </header>
      <main className={`
      compact-main workspace-main relative py-4.5 px-6 my-0 mx-auto overflow-hidden
      max-w-none min-h-0 w-full min-w-0 max-[1100px]:pl-4.5 max-[760px]:p-2.5
    `}>
        <div className="min-w-0 min-h-0 h-full overflow-hidden p-[3px] [container-type:inline-size]"><StepPresentation key={`${session.startedAt}:${location.pathname}`} seen={seenSteps.current} visit={`${session.startedAt}:${location.pathname}`}><Outlet /></StepPresentation></div>
      </main>
      <footer className="
      compact-utility-bar [.assistant-home_&]:[animation:reveal-chrome_.8s_1.6s_both] max-[760px]:py-2
      max-[760px]:px-2.5 max-[760px]:gap-[5px] max-[760px]:[grid-row:auto] max-[760px]:relative
      max-[760px]:flex-nowrap py-3 px-6 gap-4 [border-top:1px_solid_rgb(219,_229,_235)] flex flex-wrap items-center justify-end
      bg-[white] [&>div]:gap-2 [&>div]:flex [&_button]:gap-2 [&_button]:h-10 [&_button]:text-[length:12px]
      [@media(min-width:700px)_and_(max-height:740px)]:py-2 [@media(min-width:700px)_and_(max-width:950px)]:px-4.5
      [@media(min-width:700px)_and_(max-width:950px)]:[&_button]:text-[length:11px]
      [@media(min-width:700px)_and_(max-width:950px)]:[&>div]:gap-1.5 max-[699px]:py-2.5 max-[699px]:px-3
      max-[699px]:gap-2 max-[699px]:sticky max-[699px]:bottom-0 max-[699px]:flex-wrap max-[699px]:[&>div]:grow
      max-[699px]:[&>div]:shrink max-[699px]:[&>div]:basis-[0%] max-[699px]:[&>div]:justify-between
      max-[699px]:[&_button]:px-2.5 max-[699px]:[&_button]:text-[length:10px] max-[699px]:[&_button]:h-9
    "><Button variant="outline" onClick={() => setPanel('mrsopa')}>MR SOPA</Button><Button variant="outline" onClick={() => setPanel('doppes')}>DOPPES</Button><Button variant="outline" onClick={() => setPanel('saturation')}>Target SpO₂</Button><RecordedVoice clip={session.finishedAt ? 'finished' : session.step} visit={`${session.startedAt}:${session.enteredAt}:${session.stack.length}:${session.step}`} /><Button className="max-[760px]:[.compact-utility-bar_&]:text-[length:9px] [.compact-utility-bar_&]:bg-[#8d514b] [.compact-utility-bar_&]:text-[#fff]" onClick={() => setPanel('help')}><PhoneCall size={17} />{helpRequested ? 'Aiuto segnalato' : 'Richiedere aiuto'}</Button></footer>

      <SessionPanels />
    </div>
  );
}
