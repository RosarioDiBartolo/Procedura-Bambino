import AnimatedContent from './components/ui/AnimatedContent';
import { motion, useReducedMotion } from 'motion/react';
import { AppearanceContext } from './components/ui/AppearanceContext';
import { AnimatedSidebar, AnimatedSidebarProvider, AnimatedSidebarTrigger, AnimatedSidebarMenuSub, useSidebarIsMobile } from './components/motion/animated-sidebar';
import { PanelRightClose, PanelRightOpen, X, ChevronRight } from 'lucide-react';
import { Conversation, useConversation } from './assistant/Conversation';
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useLocation, useMatch } from "react-router-dom";
import { ClipboardList, Clock3, FileText, PhoneCall, RotateCcw, Thermometer } from "@nls/ui/icons8";
import { Button } from "@nls/ui/components/button";
import { formatTime, phases, secondsFrom, steps, type StepId } from "./flow";
import { useSession } from "./SessionContext";
import { useProcedureRoute } from "./navigation";
import { VoiceAssistant } from "./assistant/VoiceAssistant";
import { SessionPanels } from "./SessionPanels";
import { useNow } from "./useNow";
function StepPresentation({ visit, seen, children }: { visit: string; seen: Set<string>; children: ReactNode }) {
  const [animate] = useState(() => !seen.has(visit));
  useLayoutEffect(() => { seen.add(visit); }, [seen, visit]);
  return <AppearanceContext.Provider value={{ sequential: true, enabled: animate, replayKey: visit }}><AnimatedContent sequentialText enabled={animate} replayKey={visit} distance={0} targets=".compact-heading, .compact-list-heading, .compact-action-list>li, .step-photo-frame, .case-card, .compact-decision-instruction, .compact-clinical-note, .compact-medication, .compact-procedure-footer, .compact-birth>.compact-step-image, .compact-birth>div, .compact-completion" className="step-presentation min-h-0 flex flex-col h-full overflow-hidden">{children}</AnimatedContent></AppearanceContext.Provider>;
}
export default function App({ home: homeOverride }: { home?: boolean }) {
  const seenSteps = useRef(new Set<string>());
  const location = useLocation();
  const home = homeOverride ?? location.pathname === '/';
  const [focused, setFocused] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMobileOpen, setChatMobileOpen] = useState(false);
  const isMobile = useSidebarIsMobile();
  const chatExpanded = isMobile ? chatMobileOpen : chatOpen;
  const reducedMotion = useReducedMotion();
  const [routeOpen, setRouteOpen] = useState(false);
  const [conversationDock, setConversationDock] = useState<HTMLDivElement | null>(null);
  const [assistantDock, setAssistantDock] = useState<HTMLDivElement | null>(null);
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
      app-shell compact-shell relative overflow-x-hidden grid-rows-[24px_auto_minmax(0,1fr)_62px] h-[100dvh]
      min-h-160 grid bg-[#f0f4f7] text-[#203c50] max-[760px]:h-[100dvh] max-[760px]:min-h-0
      max-[760px]:grid-rows-[22px_auto_minmax(0,1fr)_60px] [@media(min-width:700px)_and_(max-height:740px)]:min-h-150
    ${home ? "assistant-home" : ""} ${focused ? "assistant-focused" : ""}`}>
      <div className="
      [.assistant-home_&]:[animation:reveal-chrome_.8s_1.6s_both] gap-2 [border-bottom:1px_solid_rgb(223,_229,_236)]
      h-[29px] bg-[#edf1f5] text-[#637386] flex items-center justify-center text-[length:10px] tracking-[1.3px]
      font-[700] max-[650px]:h-6.5 max-[650px]:text-[length:8px] [.compact-shell_&]:h-6
      [.compact-shell_&]:text-[length:9px] [.compact-shell_&]:tracking-[1px]
      [@media(min-width:700px)_and_(max-height:740px)]:[.compact-shell_&]:h-5
      [@media(min-width:700px)_and_(max-height:740px)]:[.compact-shell_&]:text-[length:8px]
    ">
        PROTOTIPO 02 · SIMULAZIONE · NON VALIDATO PER USO ASSISTENZIALE
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
    ${chatOpen ? 'chat-open' : 'chat-closed'}`}>
        {!home && <AnimatedSidebarProvider open={chatOpen} onOpenChange={setChatOpen} openMobile={chatMobileOpen} onOpenMobileChange={setChatMobileOpen}
          className="h-full min-h-0 gap-4.5 [--sidebar-width:340px] [--sidebar-width-icon:64px] [--sidebar-width-mobile:360px] max-[1100px]:[--sidebar-width:300px] max-md:gap-0">
          <div className="min-w-0 min-h-0 h-full flex-1 overflow-hidden p-[3px] [container-type:inline-size]"><StepPresentation key={`${session.startedAt}:${location.pathname}`} seen={seenSteps.current} visit={`${session.startedAt}:${location.pathname}`}><Outlet /></StepPresentation></div>
          {isMobile && <AnimatedSidebarTrigger className="fixed bottom-20 right-4 z-30 size-11 bg-primary text-primary-foreground shadow-lg md:hidden" aria-label="Mostra conversazione" aria-controls="session-sidebar-content"><PanelRightOpen className="size-5" /></AnimatedSidebarTrigger>}
          <AnimatedSidebar id="session-conversation" side="right" variant="sidebar" ariaLabel="Conversazione della sessione"
            className={`session-chat minimal-sidebar min-h-0 h-full ${chatExpanded ? 'is-open' : 'is-collapsed'} max-md:rounded-l-2xl`}
            panelClassName="relative top-auto h-full rounded-2xl border border-border bg-card shadow-sm">
            <Button variant="ghost" className="sidebar-toggle absolute top-2 right-2 z-10 m-0 size-8 min-h-8 p-1 [.minimal-sidebar.is-collapsed_&]:right-1/2 [.minimal-sidebar.is-collapsed_&]:translate-x-1/2" aria-label={chatExpanded ? 'Nascondi conversazione' : 'Mostra conversazione'} title={chatExpanded ? 'Riduci sidebar' : 'Apri conversazione e percorso'} aria-expanded={chatExpanded} aria-controls="session-sidebar-content" onClick={() => isMobile ? setChatMobileOpen(false) : setChatOpen(value => !value)}>{isMobile ? <X size={18} /> : chatExpanded ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}</Button>
            <div ref={setAssistantDock} className="
      assistant-sidebar-slot [.minimal-sidebar.is-collapsed_&]:pb-3 [.minimal-sidebar.is-collapsed_&]:border-b-0 [.minimal-sidebar.is-collapsed_&]:p-2 [.minimal-sidebar.is-collapsed_&]:pt-10 shrink-0
      border-b border-border p-3 pr-10 [@media(max-height:700px)]:p-2 [@media(max-height:700px)]:pr-9
    " />
            <motion.div id="session-sidebar-content" className="min-h-0 flex w-[var(--sidebar-width)] flex-col grow shrink basis-[0%] max-md:w-full" aria-hidden={!chatExpanded} inert={!chatExpanded}
              initial={false} animate={{ opacity: chatExpanded ? 1 : 0, x: chatExpanded ? 0 : 8 }} transition={{ duration: reducedMotion ? 0 : .16 }}>
              <section className="relative shrink-0 border-b border-border px-3 py-2 text-xs">
                <button type="button" aria-expanded={routeOpen} aria-controls="procedure-sidebar-route" onClick={() => setRouteOpen(value => !value)} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-1 text-left font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><ChevronRight className={`size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${routeOpen ? 'rotate-90' : ''}`} />Percorso della procedura</button>
                <AnimatedSidebarMenuSub open={routeOpen} className="mx-0 border-none pl-0"><li className="list-none"><nav id="procedure-sidebar-route" aria-label="Percorso della procedura" className="max-h-[min(160px,20dvh)] overflow-y-auto overscroll-contain pr-1">
                  <ol className="m-0 list-none space-y-1 p-0">{Object.values(steps).map((item, index) => <li key={item.id}>
                    <button disabled aria-current={item.id === session.step ? 'step' : undefined} className="flex w-full cursor-default items-start gap-2 rounded-lg px-2 py-2 text-left text-[11px] leading-relaxed text-muted-foreground aria-[current=step]:bg-primary/10 aria-[current=step]:font-semibold aria-[current=step]:text-primary">
                      <span className="w-4 shrink-0 pt-px text-center text-[10px] tabular-nums">{index + 1}</span>{item.title}
                    </button>
                  </li>)}</ol>
                </nav></li></AnimatedSidebarMenuSub>
              </section>
              <div className="
      [@media(max-height:700px)]:py-1.5 py-3 px-3.5 [border-bottom:1px_solid_rgb(220,_229,_235)] flex justify-between
      items-center text-[length:13px] [&_button]:text-[length:11px] max-[1100px]:gap-2 max-[1100px]:flex-wrap
    "><strong>Conversazione</strong></div><div className="p-3.5 overflow-auto min-h-0 grow shrink basis-[0%]"><Conversation /></div><div ref={setConversationDock} className="max-h-[70%] shrink-0 overflow-y-auto border-t border-border p-3 [@media(max-height:700px)]:p-2" />
            </motion.div>
          </AnimatedSidebar>
        </AnimatedSidebarProvider>}
      </main>
      <footer className="
      compact-utility-bar [.assistant-home_&]:[animation:reveal-chrome_.8s_1.6s_both] max-[760px]:py-2
      max-[760px]:px-2.5 max-[760px]:gap-[5px] max-[760px]:[grid-row:auto] max-[760px]:relative
      max-[760px]:flex-nowrap py-3 px-6 gap-4 [border-top:1px_solid_rgb(219,_229,_235)] flex items-center justify-end
      bg-[white] [&>div]:gap-2 [&>div]:flex [&_button]:gap-2 [&_button]:h-10 [&_button]:text-[length:12px]
      [@media(min-width:700px)_and_(max-height:740px)]:py-2 [@media(min-width:700px)_and_(max-width:950px)]:px-4.5
      [@media(min-width:700px)_and_(max-width:950px)]:[&_button]:text-[length:11px]
      [@media(min-width:700px)_and_(max-width:950px)]:[&>div]:gap-1.5 max-[699px]:py-2.5 max-[699px]:px-3
      max-[699px]:gap-2 max-[699px]:sticky max-[699px]:bottom-0 max-[699px]:flex-wrap max-[699px]:[&>div]:grow
      max-[699px]:[&>div]:shrink max-[699px]:[&>div]:basis-[0%] max-[699px]:[&>div]:justify-between
      max-[699px]:[&_button]:px-2.5 max-[699px]:[&_button]:text-[length:10px] max-[699px]:[&_button]:h-9
    "><Button className="max-[760px]:[.compact-utility-bar_&]:text-[length:9px] [.compact-utility-bar_&]:bg-[#8d514b] [.compact-utility-bar_&]:text-[#fff]" onClick={() => setPanel('help')}><PhoneCall size={17} />{helpRequested ? 'Aiuto segnalato' : 'Richiedere aiuto'}</Button></footer>
      <VoiceAssistant home={home} onFocus={setFocused} dockTarget={assistantDock} conversationTarget={conversationDock} />
      <SessionPanels />
    </div>
  );
}
