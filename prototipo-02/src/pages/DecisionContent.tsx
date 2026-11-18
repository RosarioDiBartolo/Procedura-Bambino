import TextType from '../components/ui/TextType';
import { useState, type ReactNode } from "react";
import { ArrowRight } from "@nls/ui/icons8";
import { decisionCases, selectCase, steps, type StepId } from "../flow";
import { useWorkflow } from "../useWorkflow";
import { Illustration } from "../Illustration";
import { UserPhoto } from "../UserPhotos";
export function DecisionContent({
  step,
  effective = false,
  children,
}: {
  step: StepId;
  effective?: boolean;
  children?: ReactNode;
}) {
  const { change } = useWorkflow();
  const [error, setError] = useState("");
  function choose(choice: "yes" | "no") {
    try {
      const next = selectCase(step, choice, effective);
      const item = decisionCases[step]!.find((c) => c.id === choice)!;
      change(next, `Caso selezionato: ${item.label} → ${steps[next].title}`, {
        selectedCase: choice,
        ...(step === "hr60" ? { effective } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="gap-2.5 min-h-0 grow shrink basis-[0%] flex flex-col">
      <p className="compact-decision-instruction m-0 text-[length:12px] leading-[1.5] text-[#6a8292]">
        <TextType text="Seleziona la situazione osservata dal team. Non occorre trascrivere i valori." />
      </p>
      {children}
      <div className="gap-3 [animation:none]! grid grid-cols-[1fr_1fr] min-h-0 grow shrink basis-[0%] max-[760px]:gap-2">
        {decisionCases[step]?.map((c) => (
          <button
            type="button"
            className={`
      case-card px-4 overflow-hidden border-[length:2px] border-solid border-[rgb(210,_225,_232)] flex flex-col
      items-stretch min-w-0 min-h-0 pt-3 pb-0 rounded-[14px] bg-[#f7fafb] text-left
      [transition:background_.15s,_border-color_.15s] cursor-pointer text-[#23485d] hover:border-[#3f7894]
      hover:bg-[#edf5f8] focus-visible:[outline:3px_solid_#3a7e9e] focus-visible:[outline-offset:3px] [&>strong]:mx-0
      [&>strong]:text-[length:clamp(18px,2.6cqw,28px)] [&>strong]:font-[650] [&>strong]:leading-[1.3] [&>strong]:mt-3
      [&>strong]:mb-0 [&>strong]:tracking-[-.4px] [&>p]:my-2 [&>p]:mx-0 [&>p]:text-[length:11px] [&>p]:leading-[1.55]
      [&>p]:text-[#607f91] [@media(min-width:700px)_and_(max-height:740px)]:[&>strong]:mt-2
      max-[699px]:[&>strong]:tracking-[-.2px] [&:disabled]:border-dashed [&:disabled]:[cursor:not-allowed]
      [&:disabled]:bg-[#f4f6f7] [&:disabled:hover]:border-[#b6cdd8] [&:disabled:hover]:bg-[#f4f6f7]
      [&:has(.case-conditions)>p]:mb-2.5 [&:has(.case-conditions)>p]:text-[length:11px]
      [&:has(.case-conditions)>p]:hidden
      [@media(min-width:700px)_and_(max-height:740px)]:[&:has(.case-conditions)>p]:my-[5px]
      [@media(min-width:700px)_and_(max-height:740px)]:[&:has(.case-conditions)>p]:mx-0 max-[760px]:px-2
      max-[760px]:pt-2.5 max-[760px]:pb-0 max-[760px]:[&>strong]:text-[length:16px]
      [&:has(.case-conditions)>strong]:mt-2.5 [&:has(.case-conditions)>strong]:mb-2
      [@media(min-width:761px)_and_(max-height:780px)]:px-3 [@media(min-width:761px)_and_(max-height:780px)]:pt-2
      [@media(min-width:761px)_and_(max-height:780px)]:pb-0
      [@media(min-width:761px)_and_(max-height:780px)]:[&>strong]:text-[length:20px]
      [@media(min-width:761px)_and_(max-height:780px)]:[&>strong]:leading-[1.2]
      [@media(min-width:761px)_and_(max-height:780px)]:[&:has(.case-conditions)>strong]:mt-[7px]
      [@media(min-width:761px)_and_(max-height:780px)]:[&:has(.case-conditions)>strong]:mb-1.5
    ${c.id === 'yes' ? 'border-[#b6cdd8]' : 'case-no border-[#ccded4] bg-[#f5f8f6] hover:border-[#648e78] hover:bg-[#eaf4ee]'}`}
            key={c.id}
            disabled={step === "hr60" && c.id === "yes" && !effective}
            onClick={() => choose(c.id)}
            aria-label={`${c.label}. ${c.destination}`}
          >
            <div className="
      case-art overflow-hidden [animation:none]! flex items-center justify-center relative grow-0 shrink-0
      basis-[clamp(70px,12vh,140px)] min-h-17.5 max-h-[140px] w-full h-[clamp(70px,12vh,140px)] rounded-[10px]
      [&>span]:absolute [&>span]:top-0 [&>span]:left-0 [&>span]:text-[length:9px] [&>span]:tracking-[1.4px]
      [&>span]:font-[650] [&>span]:text-[#658496] [&:has(.user-photo)>span]:py-1 [&:has(.user-photo)>span]:px-[7px]
      [&:has(.user-photo)>span]:z-[1] [&:has(.user-photo)>span]:bg-[#ffffffeb]
      [&:has(.user-photo)>span]:rounded-[5px] [&:has(.user-photo)>span]:top-[8px]
      [&:has(.user-photo)>span]:left-[8px] [&:has(.user-photo)>span]:absolute max-[760px]:max-h-[90px]
      max-[760px]:h-22.5 max-[760px]:basis-[90px] [@media(min-width:761px)_and_(max-height:780px)]:basis-[70px]
      [@media(min-width:761px)_and_(max-height:780px)]:h-17.5
      [@media(min-width:761px)_and_(max-height:780px)]:max-h-[70px]
    ">
              {step === "initial" ? (
                <UserPhoto name={c.id === "yes" ? "newborn" : "birthCare"} />
              ) : c.art === "skin" ? (
                <UserPhoto name="skin" />
              ) : (
                <Illustration name={c.art} large />
              )}
              <span>{c.id === "yes" ? "CASO 1" : "CASO 2"}</span>
            </div>
            <strong><TextType text={c.label} /></strong>
            <p><TextType text={c.detail} /></p>
            {c.conditions && (
              <ul className="
      case-conditions p-0 mx-0 gap-[5px] list-none grid mt-0 mb-2.5 [&_li]:gap-[9px] [&_li]:flex [&_li]:items-center
      [&_li]:text-[length:12px] [&_li]:leading-[1.4] [&_li]:font-[550] [&_li]:text-[#31556c] [&_li>span]:w-4.5
      [&_li>span]:text-center [&_li>span]:shrink-0 [&_li>span]:text-[#598572] [.case-no_&_li>span]:text-[#9a7950]
      max-[699px]:[&_li]:gap-[5px] max-[760px]:[&_li]:text-[length:10px]
      [@media(min-width:761px)_and_(max-height:780px)]:gap-0.5
      [@media(min-width:761px)_and_(max-height:780px)]:mb-1.5
      [@media(min-width:761px)_and_(max-height:780px)]:[&_li]:text-[length:10px]
      [@media(min-width:761px)_and_(max-height:780px)]:[&_li]:leading-[1.3]
    ">
                {c.conditions.map((condition) => (
                  <li key={condition}>
                    <span aria-hidden="true">{c.id === "yes" ? "✓" : "•"}</span>
                    <TextType text={condition} />
                  </li>
                ))}
              </ul>
            )}
            <div className="
      gap-3 [border-top:1px_solid_rgb(212,_226,_233)] mt-auto flex items-center justify-between min-h-10.5
      text-[length:11px] font-[650] text-[#315e77] [.case-no_&]:border-[#d0e0d6] [.case-no_&]:text-[#3e6e59]
      max-[699px]:[&_svg]:w-[15px] max-[699px]:[&_svg]:shrink-0 [.case-card:disabled_&]:text-[#8798a2]
      max-[760px]:text-[length:9px] max-[760px]:min-h-9.5 [@media(min-width:761px)_and_(max-height:780px)]:py-[5px]
      [@media(min-width:761px)_and_(max-height:780px)]:min-h-7
      [@media(min-width:761px)_and_(max-height:780px)]:text-[length:10px]
    ">
              <TextType text={c.destination} />
              <ArrowRight size={20} />
            </div>
          </button>
        ))}
      </div>
      {error && (
        <p className="py-2 px-3 m-0 border border-solid border-[rgb(237,_203,_196)] text-[length:11px] text-[#a34742] bg-[#fff1ed] rounded-[7px] shrink-0" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
