import { Illustration, stepArt } from "./Illustration";
import { UserPhoto, stepPhotos } from "./UserPhotos";
import type { StepId } from "./flow";
import simulation from "./assets/clinical/simulation.jpg";
import airway from "./assets/clinical/airway.png";
export function StepImage({ step }: { step: StepId }) {
  const supplied = stepPhotos[step];
  if (supplied)
    return (
      <figure className="compact-step-image supplied-step-image">
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
    <figure className="compact-step-image">
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
