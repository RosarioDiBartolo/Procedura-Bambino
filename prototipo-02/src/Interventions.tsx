import TextType from './components/ui/TextType';
import { useId, useRef } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { Dialog as Primitive } from "radix-ui";
import { CheckCircle2, X } from "@nls/ui/icons8";
import { ArrowUpRight } from "lucide-react";
import { Checkbox } from "@nls/ui/components/checkbox";
import { getInterventions } from "./actionDetails";
import { phases, steps, type StepId } from "./flow";
import { useProcedureRoute } from "./navigation";
const images = import.meta.glob("./assets/illustrations/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const image = (art: string) => images[`./assets/illustrations/${art}.svg`];
export function AnimatedInterventions({
  step,
  showChecklist,
  checks,
  onCheck,
}: {
  step: StepId;
  showChecklist: boolean;
  checks: Record<string, boolean>;
  onCheck: (index: number, checked: boolean) => void;
}) {
  const { panel, setPanel } = useProcedureRoute();
  const details = getInterventions(step);
  const selected = details.find((item) => item.panel === panel);
  const origin = useRef<HTMLButtonElement | null>(null);
  const scope = useId();
  const reduced = useReducedMotion();
  const transition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 360, damping: 34 };
  return (
    <LayoutGroup id={scope}>
      <p className="mx-0 hidden text-[length:11px] leading-[1.6] text-[#6b8190] mt-0 mb-3.5 min-[700px]:[.dense-procedure_&]:mb-3">
        Apri un intervento per leggere spiegazione e coordinamento con il team.
      </p>
      <ol data-action-count={details.length} className="
      compact-action-list animated-intervention-list m-0 flex min-h-0 flex-1 list-none flex-col overflow-y-auto [.many-actions_&]:overflow-hidden p-0 [.very-dense-actions_&]:[@media(max-height:700px)]:grid [.very-dense-actions_&]:[@media(max-height:700px)]:grid-cols-2 [.very-dense-actions_&]:[@media(max-height:700px)]:gap-x-5
      [justify-content:safe_center] [.many-actions_&]:justify-evenly [&_[data-slot=checkbox]]:size-5 [&_[data-slot=checkbox]]:shrink-0
    ">
        {details.map((item, i) => (
          <li className="shrink-0" key={item.panel} data-assistant-target={`${step}-${i}`}>
            <motion.div
              className="relative flex min-h-0 items-center gap-2 border-b border-[#dce7e7] bg-transparent p-0 hover:bg-[#f1f7f5]"
              layoutId={`card-${item.panel}`}
              transition={transition}
            >
              {showChecklist && (
                <Checkbox
                  aria-label={`Registra ${item.title}`}
                  checked={!!checks[`${step}-${i}`]}
                  onCheckedChange={(value) => onCheck(i, value === true)}
                />
              )}
              <button
                className="
      grid h-auto w-full min-w-0 flex-1 grid-cols-[32px_minmax(0,1fr)_48px] items-center gap-3.5 border-0
      bg-transparent px-0 py-2 [.many-actions_&]:py-1.5 [@media(max-height:700px)]:[.many-actions_&]:py-1 text-left text-[#23485d] outline-none focus-visible:ring-2 focus-visible:ring-ring
      [.many-actions_&]:grid-cols-[26px_minmax(0,1fr)_36px] [.many-actions_&]:gap-2.5
      [@container(max-width:650px)]:grid-cols-[24px_minmax(0,1fr)_36px] [@container(max-width:650px)]:gap-2.5
    "
                aria-label={`Approfondisci: ${item.title}`}
                aria-haspopup="dialog"
                aria-expanded={panel === item.panel}
                onClick={(event) => {
                  origin.current = event.currentTarget;
                  setPanel(item.panel as import("./navigation").Panel);
                }}
              >
                <span className="
      p-0 border-0 border-none border-[currentColor] w-7 h-7 grid place-items-center rounded-full bg-[#e9f2ee]
      text-[length:12px] text-[#417267] self-center justify-self-center items-center justify-center grow-0 shrink-0
      basis-[28px] font-[700] tabular-nums leading-[1] max-[760px]:w-5 max-[760px]:h-5 max-[760px]:text-[length:10px]
      max-[699px]:basis-[24px]
    " aria-hidden="true">{i + 1}</span>
                <span className="flex min-w-0 flex-col">
                  <motion.strong className={`block whitespace-normal leading-[1.22] font-[650] tracking-[-.4px] text-[#23485d] ${details.length === 4
                    ? 'text-[clamp(20px,3cqw,28px)] [@container(max-width:450px)]:text-[16px] [@media(max-height:700px)]:text-[16px]'
                    : details.length >= 5 ? 'text-[clamp(16px,2.4cqw,26px)] [@media(max-height:700px)]:text-[16px]'
                    : 'text-[clamp(28px,3.8cqw,44px)] [@container(max-width:650px)]:text-[clamp(18px,3.5cqw,26px)] [@media(max-height:700px)]:text-[clamp(16px,2.6cqw,23px)]'}`}
                    layoutId={`title-${item.panel}`}
                    transition={transition}
                  >
                    <TextType text={item.title} />
                  </motion.strong>
                  <span className="intervention-summary
      mt-1 block whitespace-normal text-[clamp(13px,1.6cqw,17px)] leading-[1.55] text-[#677f8f]
      [.many-actions_&]:hidden [@container(max-width:650px)]:text-[11px] [@media(max-height:700px)]:hidden
    " title={item.summary}><TextType text={item.summary} /></span>
                </span>
                <span className="intervention-icon grid size-12 shrink-0 place-items-center self-center justify-self-center [.many-actions_&]:size-9 [@container(max-width:650px)]:size-9" aria-hidden="true">
                <motion.img
                  layoutId={`image-${item.panel}`}
                  src={image(item.art)}
                  alt=""
                  className="block size-full object-contain object-center"
                  transition={transition}
                />
                </span>
                <ArrowUpRight
                  className="hidden shrink-0 text-[#628497] max-[699px]:w-4"
                  size={19}
                  aria-hidden="true"
                />
              </button>
            </motion.div>
          </li>
        ))}
      </ol>
      <Primitive.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <AnimatePresence>
          {selected && (
            <Primitive.Portal forceMount key={selected.panel}>
              <Primitive.Overlay forceMount asChild>
                <motion.div
                  className="fixed top-0 right-0 bottom-0 left-0 z-[70] bg-[#142f46a6] [backdrop-filter:blur(5px)] motion-reduce:[scroll-behavior:auto] motion-reduce:[transition:none]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                />
              </Primitive.Overlay>
              <div className="fixed top-0 right-0 bottom-0 left-0 z-[71] flex items-center justify-center pointer-events-none">
                <Primitive.Content
                  forceMount
                  asChild
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    origin.current?.focus({ preventScroll: true });
                  }}
                >
                  <motion.div
                    className="
      rounded-[20px] overflow-auto border border-solid border-[rgb(220,_229,_235)] relative [pointer-events:auto]
      grid grid-cols-[230px_minmax(0,_1fr)] w-[min(880px,_calc(100vw_-_48px))] max-h-[calc(100dvh_-_64px)] bg-[#fff]
      [box-shadow:0_30px_100px_#132f4759] [outline:none] text-[#23485d] [&_h2]:mx-0 [&_h2]:text-[length:28px]
      [&_h2]:font-[650] [&_h2]:tracking-[-0.6px] [&_h2]:leading-[1.2] [&_h2]:mt-2.5 [&_h2]:mb-3.5 [&_h2]:pr-3
      [@media(min-width:700px)_and_(max-height:740px)]:max-h-[calc(100dvh_-_32px)] max-[699px]:w-[calc(100vw_-_24px)]
      max-[699px]:max-h-[calc(100dvh_-_24px)] max-[699px]:grid-cols-[1fr] max-[699px]:[&_h2]:text-[length:25px]
      motion-reduce:[scroll-behavior:auto] motion-reduce:[transition:none]
    "
                    layoutId={`card-${selected.panel}`}
                    transition={transition}

                  >
                    <Primitive.Close
                      className="
      border border-solid border-[rgb(220,_229,_235)] absolute right-[15px] top-[15px] z-[2] grid place-items-center
      w-8.5 h-8.5 rounded-full bg-[#fff] text-[#315a70] hover:bg-[#edf4f7] focus-visible:[outline:2px_solid_#436e85]
      focus-visible:[outline-offset:3px]
    "
                      aria-label="Chiudi approfondimento"
                    >
                      <X size={20} />
                    </Primitive.Close>
                    <div className="
      py-7.5 px-6 gap-5.5 flex flex-col items-center justify-center bg-[#edf4f7] min-h-70 [&>span]:text-[length:9px]
      [&>span]:tracking-[1.5px] [&>span]:font-[650] [&>span]:text-[#678696] [&>img]:w-45 [&>img]:h-50
      [&>img]:object-contain [&>small]:text-[length:10px] [&>small]:text-[#728c9c] max-[699px]:py-5 max-[699px]:px-6
      max-[699px]:gap-2 max-[699px]:min-h-0 max-[699px]:[&>img]:w-27.5 max-[699px]:[&>img]:h-22.5
      max-[699px]:[&>small]:hidden
    ">
                      <span>
                        {phases[steps[step].phase]} · 0
                        {details.indexOf(selected) + 1}
                      </span>
                      <motion.img
                        layoutId={`image-${selected.panel}`}
                        transition={transition}
                        src={image(selected.art)}
                        alt={`Illustrazione: ${selected.title}`}
                      />
                      <small>Illustrazione del contesto</small>
                    </div>
                    <div className="px-9.5 pt-9.5 pb-7.5 min-w-0 [@media(min-width:700px)_and_(max-height:740px)]:py-7 max-[699px]:p-6">
                      <span className="text-[length:9px] tracking-[1.7px] font-[700] text-[#638a8b]">
                        {steps[step].source}
                      </span>
                      <Primitive.Title asChild>
                        <motion.h2
                          layoutId={`title-${selected.panel}`}
                          transition={transition}
                        >
                          {selected.title}
                        </motion.h2>
                      </Primitive.Title>
                      <Primitive.Description className="mx-0 text-[length:13px] leading-[1.75] text-[#617989] mt-0 mb-[23px] max-[699px]:text-[length:12px]">
                        {selected.intro}
                      </Primitive.Description>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: reduced ? 0 : 0.18,
                          delay: reduced ? 0 : 0.1,
                        }}
                      >
                        <ol className="
      p-0 m-0 gap-4.5 list-none grid [&>li]:gap-3 [&>li]:flex [&>li>span]:pt-0.5 [&>li>span]:text-[length:10px]
      [&>li>span]:text-[#75949b] [&>li>span]:font-[650] [&_h3]:mx-0 [&_h3]:text-[length:14px] [&_h3]:font-[650]
      [&_h3]:leading-[1.5] [&_h3]:mt-0 [&_h3]:mb-1 [&_p]:m-0 [&_p]:text-[length:12px] [&_p]:leading-[1.75]
      [&_p]:text-[#617989] max-[699px]:gap-4
    ">
                          {selected.sections.map(([title, text], i) => (
                            <li key={title}>
                              <span>0{i + 1}</span>
                              <div>
                                <h3>{title}</h3>
                                <p>{text}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                        <p className="
      py-[13px] px-[15px] mx-0 gap-2.5 flex items-start rounded-[10px] bg-[#edf5f0] text-[length:12px] leading-[1.65]
      text-[#456b58] mt-6 mb-3.5 [&_svg]:shrink-0 [&_svg]:mt-0.5
    ">
                          <CheckCircle2 size={19} />
                          {selected.takeaway}
                        </p>
                        <p className="mx-0 text-[length:10px] leading-[1.6] text-[#8595a0] mt-0 mb-5">
                          Riferimento: {steps[step].source}. Le spiegazioni sono
                          un approfondimento didattico per la simulazione; non
                          costituiscono una checklist clinica validata.
                        </p>
                        <Primitive.Close className="
      focus-visible:[outline:2px_solid_#436e85] focus-visible:[outline-offset:3px] py-2.5 px-4 border border-solid
      border-[rgb(205,_220,_229)] rounded-[8px] bg-[#fff] text-[length:12px] font-[600] text-[#315a70]
    ">
                          Torna agli interventi
                        </Primitive.Close>
                      </motion.div>
                    </div>
                  </motion.div>
                </Primitive.Content>
              </div>
            </Primitive.Portal>
          )}
        </AnimatePresence>
      </Primitive.Root>
    </LayoutGroup>
  );
}
