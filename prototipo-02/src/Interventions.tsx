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
import "./Interventions.css";
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
      <p className="intervention-hint">
        Apri un intervento per leggere spiegazione e coordinamento con il team.
      </p>
      <ol className="compact-action-list animated-intervention-list">
        {details.map((item, i) => (
          <li key={item.panel}>
            <motion.div
              className="intervention-card"
              layoutId={`card-${item.panel}`}
              transition={transition}
              style={{ borderRadius: 12 }}
            >
              {showChecklist && (
                <Checkbox
                  aria-label={`Registra ${item.title}`}
                  checked={!!checks[`${step}-${i}`]}
                  onCheckedChange={(value) => onCheck(i, value === true)}
                />
              )}
              <button
                className="intervention-open"
                aria-label={`Approfondisci: ${item.title}`}
                aria-haspopup="dialog"
                aria-expanded={panel === item.panel}
                onClick={(event) => {
                  origin.current = event.currentTarget;
                  setPanel(item.panel as import("./navigation").Panel);
                }}
              >
                <span className="intervention-number" aria-hidden="true">{i + 1}</span>
                <motion.img
                  layoutId={`image-${item.panel}`}
                  src={image(item.art)}
                  alt=""
                  className="intervention-thumbnail"
                  transition={transition}
                />
                <span className="intervention-copy">
                  <motion.strong
                    layoutId={`title-${item.panel}`}
                    transition={transition}
                  >
                    {item.title}
                  </motion.strong>
                  <span title={item.summary}>{item.summary}</span>
                </span>
                <ArrowUpRight
                  className="intervention-expand"
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
                  className="intervention-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                />
              </Primitive.Overlay>
              <div className="intervention-positioner">
                <Primitive.Content
                  forceMount
                  asChild
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    origin.current?.focus();
                  }}
                >
                  <motion.div
                    className="intervention-detail"
                    layoutId={`card-${selected.panel}`}
                    transition={transition}
                    style={{ borderRadius: 20 }}
                  >
                    <Primitive.Close
                      className="intervention-close"
                      aria-label="Chiudi approfondimento"
                    >
                      <X size={20} />
                    </Primitive.Close>
                    <div className="intervention-detail-art">
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
                    <div className="intervention-detail-body">
                      <span className="intervention-eyebrow">
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
                      <Primitive.Description className="intervention-intro">
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
                        <ol className="intervention-explanation">
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
                        <p className="intervention-takeaway">
                          <CheckCircle2 size={19} />
                          {selected.takeaway}
                        </p>
                        <p className="intervention-source">
                          Riferimento: {steps[step].source}. Le spiegazioni sono
                          un approfondimento didattico per la simulazione; non
                          costituiscono una checklist clinica validata.
                        </p>
                        <Primitive.Close className="intervention-return">
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
