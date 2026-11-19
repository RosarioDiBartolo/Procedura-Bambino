import { Illustration, stepArt } from "./Illustration";
import { UserPhoto, stepPhotos } from "./UserPhotos";
import type { StepId } from "./flow";
import simulation from "./assets/clinical/simulation.jpg";
import airway from "./assets/clinical/airway.png";
import respiratorySupport from "./assets/clinical/respiratory-support-unsplash.jpg";
import medication from "./assets/clinical/medication-unsplash.jpg";
export function StepImage({ step }: { step: StepId }) {
  if (step === 'medication') return <figure className="compact-step-image relative m-0 flex size-full min-h-0 min-w-0 flex-1 overflow-hidden">
    <img src={medication} alt="Mani con guanti preparano una siringa da un flaconcino" className="size-full min-h-0 flex-1 object-cover" />
    <figcaption className="absolute inset-x-0 bottom-0 bg-[#163e49c9] p-2 text-center text-[8px] leading-relaxed text-white">
      <a href="https://unsplash.com/photos/person-drawing-liquid-into-syringe-cM1aU42FnRg" target="_blank" rel="noreferrer" className="underline">Unsplash</a>
      <span className="block">Foto di contesto · preparazione farmaci</span>
    </figcaption>
  </figure>;
  if (step === 'distress-support') return <figure className="compact-step-image relative m-0 flex size-full min-h-0 min-w-0 flex-1 overflow-hidden">
    <img src={respiratorySupport} alt="Neonato in incubatrice con supporto di ossigeno e monitoraggio" className="size-full min-h-0 flex-1 object-cover object-[80%_50%]" />
    <figcaption className="absolute inset-x-0 bottom-0 bg-[#163e49c9] p-2 text-center text-[8px] leading-relaxed text-white">
      <a href="https://unsplash.com/photos/baby-lying-in-incubator-74-7j5t4sG0" target="_blank" rel="noreferrer" className="underline">Unsplash</a>
      <span className="block">Foto di contesto · assistenza neonatale</span>
    </figcaption>
  </figure>;
  const supplied = stepPhotos[step];
  if (supplied)
    return (
      <figure className="
      compact-step-image relative m-0 flex size-full min-h-0 min-w-0 flex-1 overflow-hidden [&>img]:size-full
      [&>img]:min-h-0 [&>img]:max-h-none [&>img]:flex-1 [&>img]:object-cover [&>.step-illustration]:size-full
      [&>.step-illustration]:max-w-none [&>.step-illustration]:object-cover [.compact-birth>&]:rounded-2xl
      [&_figcaption]:absolute [&_figcaption]:inset-x-0 [&_figcaption]:bottom-0 [&_figcaption]:z-10
      [&_figcaption]:bg-[#163e49c9] [&_figcaption]:p-2 [&_figcaption]:text-center [&_figcaption]:text-[8px]
      [&_figcaption]:leading-relaxed [&_figcaption]:text-white [&_figcaption_a]:underline [&_figcaption_span]:block
    ">
        <UserPhoto name={supplied} />
      </figure>
    );
  const photo = ["ppv", "compressions"].includes(step)
    ? {
        src: simulation,
        author: "SylviaGollnerMedUniGraz",
        file: "MedUniGraz_CSC.jpg",
        alt: "Simulazione su manichino di ventilazione e compressioni",
      }
    : ["correctives", "first-actions"].includes(step)
      ? {
          src: airway,
          author: "BruceBlaus",
          file: "CPR_Infant_Closed_vs_Open_Airway.png",
          alt: "Confronto anatomico delle vie aeree nel lattante",
        }
      : null;
  return (
    <figure className="
      compact-step-image relative m-0 flex size-full min-h-0 min-w-0 flex-1 overflow-hidden [&>img]:size-full
      [&>img]:min-h-0 [&>img]:max-h-none [&>img]:flex-1 [&>img]:object-cover [&>.step-illustration]:size-full
      [&>.step-illustration]:max-w-none [&>.step-illustration]:object-cover [.compact-birth>&]:rounded-2xl
      [&_figcaption]:absolute [&_figcaption]:inset-x-0 [&_figcaption]:bottom-0 [&_figcaption]:z-10
      [&_figcaption]:bg-[#163e49c9] [&_figcaption]:p-2 [&_figcaption]:text-center [&_figcaption]:text-[8px]
      [&_figcaption]:leading-relaxed [&_figcaption]:text-white [&_figcaption_a]:underline [&_figcaption_span]:block
    ">
      {photo ? (
        <>
          <img src={photo.src} alt={photo.alt} />
          <figcaption>
            <a
              href={`https://commons.wikimedia.org/wiki/File:${photo.file}`}
              target="_blank"
              rel="noreferrer"
            >
              {photo.author}
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
            <span>
              {step === "ppv" || step === "compressions"
                ? "Simulazione su manichino"
                : step === "correctives" || step === "first-actions"
                  ? "Confronto anatomico, non tecnica esecutiva"
                  : ""}
            </span>
          </figcaption>
        </>
      ) : (
        <Illustration name={stepArt[step]} large />
      )}
    </figure>
  );
}
