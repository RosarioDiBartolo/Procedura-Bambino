import TextType from '../components/ui/TextType';
import { useState } from "react";
import { Button } from "@nls/ui/components/button";
import { steps, type StepId } from "../flow";
import { useSession } from "../SessionContext";
import { useWorkflow } from "../useWorkflow";
import { StepImage } from "../StepImage";
import { AnimatedInterventions } from "../Interventions";
export function ActionContent({ step }: { step: StepId }) {
  const [session] = useSession();
  const { checkAction } = useWorkflow();
  const [show, setShow] = useState(false);
  const current = steps[step];
  const actions = current.actions ?? [];
  const completed = actions.filter(
    (_, i) => session.checks[`${step}-${i}`],
  ).length;
  return (
    <div
      className={`
      action-workspace p-0 gap-7 overflow-hidden border-0 border-none border-[currentColor] [animation:none]! grid
      grid-cols-[minmax(0,1.25fr)_minmax(0,.85fr)] [&.many-actions]:grid-cols-[minmax(0,1.65fr)_minmax(120px,.65fr)] [@media(max-height:700px)]:[&.very-dense-actions]:grid-cols-1 grow shrink basis-[0%] min-h-0 items-stretch
      grid-rows-[minmax(0,1fr)] min-w-0 max-[760px]:gap-3 max-[760px]:grid-cols-[minmax(0,1fr)_minmax(80px,.55fr)] max-[760px]:[&.many-actions]:grid-cols-[minmax(0,1fr)_minmax(80px,.45fr)] max-[760px]:[&.very-dense-actions]:grid-cols-1
    ${actions.length >= 4 ? "many-actions" : ""} ${actions.length >= 5 ? "very-dense-actions" : ""}`}
    >
      <div className="gap-3 min-w-0 flex flex-col min-h-0 [.many-actions_&]:gap-2">
        <div className="
      compact-list-heading m-0 gap-2 flex justify-between items-center shrink-0 min-h-7.5 [&>strong]:gap-2
      [&>strong]:text-[length:12px] [&>strong]:text-[#35566a] [&>strong]:font-[600] [&>strong]:flex
      [&>strong]:items-center [&_button]:py-[5px] [&_button]:px-2 [&_button]:text-[length:10px] [&_button]:h-7.5
      [@media(min-width:700px)_and_(max-width:950px)]:gap-0
      [@media(min-width:700px)_and_(max-width:950px)]:items-center
      [@media(min-width:700px)_and_(max-width:950px)]:flex-row
      [@media(min-width:700px)_and_(max-width:950px)]:flex-wrap
      [@media(min-width:700px)_and_(max-width:950px)]:[&>strong]:flex max-[699px]:[&>strong]:flex
      max-[699px]:[&>strong]:text-[length:11px] max-[699px]:justify-between max-[699px]:flex-wrap
      max-[760px]:gap-[3px] max-[760px]:flex-wrap max-[760px]:[&>strong]:hidden
      max-[760px]:[&_button]:text-[length:9px] max-[760px]:[&_button]:h-6.5
    ">
          <strong>
            <TextType text="Interventi da eseguire" />{" "}
            <span className="py-0.5 px-1.5 text-[length:10px] text-[#6c8999] bg-[#edf3f6] rounded-[5px]">{actions.length}</span>
          </strong>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={show}
            onClick={() => setShow((v) => !v)}
          >
            {show
              ? `Nascondi spunte (${completed}/${actions.length})`
              : "Registra interventi (facoltativo)"}
          </Button>
        </div>
        <p className="
      max-[760px]:[.very-dense-actions_&]:hidden [@media(max-height:700px)]:[.many-actions_&]:hidden m-0 text-[length:clamp(14px,1.6cqw,19px)] leading-[1.65] text-[#53717c] shrink-0
      [@media(min-width:761px)_and_(max-height:780px)]:text-[length:13px]
      [@media(min-width:761px)_and_(max-height:780px)]:leading-[1.45] max-[760px]:text-[length:12px]
      max-[760px]:leading-[1.45]
    "><TextType text={current.subtitle} /></p>
        <AnimatedInterventions
          step={step}
          showChecklist={show}
          checks={session.checks}
          onCheck={(i, value) => checkAction(step, i, value)}
        />
      </div>
      <aside className="
      action-context step-photo-frame max-[760px]:[.very-dense-actions_&]:hidden [@media(max-height:700px)]:[.very-dense-actions_&]:hidden p-0 gap-0 overflow-hidden border border-solid border-[rgb(220,_229,_235)] flex
      flex-col relative min-h-0 min-w-0 w-full h-full rounded-[16px] bg-[#edf3f1] grid-cols-[110px_minmax(0,_1fr)]
      items-start [&>small]:px-3.5 [&>small]:m-0 [&>small]:absolute [&>small]:bottom-0 [&>small]:left-0
      [&>small]:right-0 [&>small]:[background:linear-gradient(transparent,#173f44b8)] [&>small]:text-[white]
      [&>small]:text-[length:9px] [&>small]:pt-6 [&>small]:pb-3 [&>small]:pointer-events-none [&>small]:block
      [&>small]:leading-[1.6] [&:has(figcaption)>small]:hidden max-[760px]:[&>small]:px-1.5
      max-[760px]:[&>small]:text-[length:7px] max-[760px]:[&>small]:pt-5 max-[760px]:[&>small]:pb-2 [&>span]:mx-0
      [&>span]:block [&>span]:text-[length:9px] [&>span]:tracking-[1.5px] [&>span]:font-[700] [&>span]:text-[#7a919d]
      [&>span]:mt-[1px] [&>span]:mb-0 [&>p]:m-0 [&>p]:text-[length:12px] [&>p]:leading-[1.7] [&>p]:text-[#577284]
      [&>p]:max-w-[900px] [@media(min-width:700px)_and_(max-width:950px)]:[&>p]:text-[length:11px]
      max-[699px]:grid-cols-[80px_minmax(0,_1fr)] max-[699px]:[&>span]:text-[length:8px]
      max-[699px]:[&>p]:text-[length:11px]
    "><StepImage step={step} /><small>{current.source}</small></aside>
    </div>
  );
}
