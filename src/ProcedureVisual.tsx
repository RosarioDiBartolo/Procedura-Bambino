import {useState} from 'react'
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {Illustration,stepArt} from './Illustration'
import type {Step,StepId} from './flow'
import simulation from './assets/clinical/simulation.jpg'
import airway from './assets/clinical/airway.png'
import skin from './assets/clinical/skin.jpg'

type Visual={title:string;points:string[];image?:string;alt?:string;author?:string;source?:string}
const visuals:Record<StepId,Visual>={
 preparation:{title:'Preparare persone e materiale',points:['Counseling prenatale','Ruoli condivisi nel briefing','Materiale verificato prima della nascita']},
 birth:{title:'La nascita è il riferimento del tempo',points:['Registra il momento della nascita','Il tempo trascorso guida la lettura dei target SpO₂']},
 cord:{title:'Cordone: gestione concordata con il team',points:['Concorda il clampaggio','Assisti la gestione del cordone','Non ritardare gli interventi necessari']},
 initial:{title:'Tre osservazioni, tre risposte',points:['Età gestazionale: gravidanza a termine?','Tono: buon tono?','Respiro: respira o piange?']},
 skin:{title:'Contatto e osservazione continua',points:['Contatto skin to skin','Controllo della temperatura','Valutazione continua del neonato'],image:skin,alt:'Neonato appoggiato a contatto con il torace materno',author:'DerringUndo',source:'Newborn_on_mother_chest.jpg'},
 'first-actions':{title:'Proteggere la temperatura e le vie aeree',points:['Calore e asciugatura','Posizione idonea e secrezioni solo se necessario','Stimolazione e riposizionamento'],image:airway,alt:'Confronto anatomico tra via aerea chiusa e aperta nel lattante; etichette originali in inglese',author:'BruceBlaus',source:'CPR_Infant_Closed_vs_Open_Airway.png'},
 respiration:{title:'Osserva il respiro e rileva la FC',points:['Apnea o gasping presenti?','Frequenza cardiaca inferiore a 100/min?','Registra separatamente respiro e valore della FC']},
 distress:{title:'Riconoscere la difficoltà respiratoria',points:['Osserva se il respiro è difficoltoso','Verifica la cianosi persistente','Almeno una delle condizioni presente → SÌ']},
 'distress-support':{title:'Vie aeree, ossigenazione e supporto',points:['Mantieni pervie le vie aeree','Monitora SpO₂ e supplementazione O₂','Considera la CPAP con il team']},
 ppv:{title:'Ventilazione e monitoraggio',points:['Ventilazione a pressione positiva','Monitoraggio SpO₂; considera ECG','Rivalutazione della frequenza cardiaca'],image:simulation,alt:'Simulazione su manichino: operatori coordinano ventilazione e compressioni',author:'SylviaGollnerMedUniGraz',source:'MedUniGraz_CSC.jpg'},
 hr100:{title:'Rivalutare dopo la ventilazione',points:['Rileva la frequenza cardiaca','FC <100/min → correttivi','FC ≥100/min → cure post-rianimatorie']},
 correctives:{title:'Verificare la ventilazione',points:['Maschera, posizione, secrezioni, bocca e pressioni','Se necessario: via aerea alternativa','Attiva il monitoraggio ECG'],image:airway,alt:'Tavola anatomica della pervietà delle vie aeree nel lattante',author:'BruceBlaus',source:'CPR_Infant_Closed_vs_Open_Airway.png'},
 hr60:{title:'FC e ventilazione efficace',points:['Rileva la frequenza cardiaca dopo i correttivi','Se FC <60/min, conferma la ventilazione efficace con il team','La conferma precede l’accesso alle compressioni']},
 compressions:{title:'Coordinare compressioni e ventilazione',points:['O₂ al 100% e gestione della via aerea','Compressioni coordinate con PPV; monitor ECG','Considera CVO o IO con il team'],image:simulation,alt:'Addestramento su manichino: un operatore ventila e un altro esegue compressioni con le mani intorno al torace',author:'SylviaGollnerMedUniGraz',source:'MedUniGraz_CSC.jpg'},
 'advanced-hr':{title:'Rivalutare dopo il supporto coordinato',points:['Rileva e comunica la frequenza cardiaca','FC <60/min → adrenalina e cause reversibili','Altrimenti: rivalutazione con il team']},
 medication:{title:'Somministrazione e ricerca delle cause',points:['Adrenalina su prescrizione, via CVO o IO','Registra la somministrazione e il tempo trascorso','Se FC <60/min persiste: ipovolemia e DOPPES']},
 'recovery-review':{title:'Condividere la risposta al supporto',points:['Comunica la frequenza cardiaca','Rivaluta il respiro','Concorda la prosecuzione con il team']},
 post:{title:'Proseguire l’assistenza e ricostruire gli eventi',points:['Cure post-rianimatorie','Valutazioni, interventi e tempi registrati','Debriefing del team']}
}
export function ProcedureVisual({step}:{step:Step}){
 const [open,setOpen]=useState(false)
 const v=visuals[step.id]
 const drawing=<Illustration name={stepArt[step.id]} large/>
 return <>
  <figure className={`
      mx-0 overflow-hidden border border-solid border-[rgb(217,_229,_233)] mt-5.5 mb-6.5 rounded-[16px] bg-[#f5f9fa]
      [&_figcaption]:py-[25px] [&_figcaption]:px-5 [&_figcaption]:self-center [&_figcaption>strong]:block
      [&_figcaption>strong]:text-[length:18px] [&_figcaption>strong]:leading-[1.5]
      [&_figcaption>strong]:text-[#244b60] [&_ol]:p-0 [&_ol]:mx-0 [&_ol]:gap-[17px] [&_ol]:list-none [&_ol]:mt-5
      [&_ol]:mb-0 [&_ol]:grid [&_li]:gap-2.5 [&_li]:flex [&_li]:items-start [&_li]:text-[length:12px]
      [&_li]:leading-[1.7] [&_li]:text-[#496a7d] [&_li>span]:grid [&_li>span]:place-items-center
      [&_li>span]:min-w-[23px] [&_li>span]:h-[23px] [&_li>span]:rounded-full [&_li>span]:bg-[#e0eeed]
      [&_li>span]:text-[#326967] [&_li>span]:text-[length:10px] [&_li>span]:font-[700]
      max-[1150px]:[&_figcaption]:p-5 max-[1150px]:[&_ol]:gap-3 max-[1150px]:[&_ol]:mt-3.5
      max-[650px]:[&_figcaption>strong]:text-[length:17px] max-[650px]:[&_li]:text-[length:12px]
    ${v.image?'has-clinical-image':''}`} aria-label={`Guida visiva: ${v.title}`}>
   <div className="
      py-[13px] px-4.5 gap-3 [border-bottom:1px_solid_rgb(223,_233,_236)] flex items-center justify-between
      [&>span]:text-[length:10px] [&>span]:tracking-[1.5px] [&>span]:font-[700] [&>span]:text-[#527182]
      [&_button]:p-1.5 [&_button]:border-0 [&_button]:border-none [&_button]:border-[currentColor]
      [&_button]:text-[length:11px] [&_button]:text-[#315b72] [&_button]:bg-[transparent] [&_button]:cursor-pointer
      max-[650px]:py-2.5 max-[650px]:px-3 max-[650px]:[&_button]:text-[length:10px]
    "><span>GUIDA VISIVA</span><button type="button" onClick={()=>setOpen(true)}>Ingrandisci immagine ↗</button></div>
   <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch min-h-72.5 max-[1150px]:grid-cols-[1fr]"><div className="
      procedure-artwork p-2.5 flex items-center justify-center bg-[white] min-w-0
      [&>img:not(.step-illustration)]:w-full [&>img:not(.step-illustration)]:h-80
      [&>img:not(.step-illustration)]:object-contain max-[1150px]:[&>img:not(.step-illustration)]:h-85
      max-[650px]:[&>img:not(.step-illustration)]:h-75
    ">{v.image?<img src={v.image} alt={v.alt} width="800" height="600"/>:drawing}</div><figcaption><strong>{v.title}</strong><ol>{v.points.map((point,i)=><li key={point}><span>{i+1}</span>{point}</li>)}</ol></figcaption></div>
   {v.source&&<div className="
      py-2.5 px-4 [border-top:1px_solid_rgb(225,_233,_237)] bg-[white] text-[length:9px] leading-[1.8] text-[#728793]
      [&_a]:underline [&_a]:[text-underline-offset:2px]
    "><a href={`https://commons.wikimedia.org/wiki/File:${v.source}`} target="_blank" rel="noreferrer">{v.author} · Wikimedia Commons</a><span> · </span><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a><span> · Immagine originale, non modificata.{v.image===simulation?' Simulazione su manichino.':v.image===airway?' Confronto anatomico; non rappresenta la tecnica esecutiva.':''}</span></div>}
  </figure>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="
      procedure-image-dialog overflow-auto w-[min(94vw,1050px)]! max-w-[1050px]! max-h-[93vh] [&>img]:w-full
      [&>img]:h-auto [&>img]:max-h-[65vh] [&>img]:object-contain [&>p]:text-[length:12px] [&>p]:leading-[1.8]
      [&>p]:text-[#496a7d] [&_a]:underline
    "><DialogHeader><DialogTitle>{v.title}</DialogTitle></DialogHeader>{v.image?<img src={v.image} alt={v.alt}/>:drawing}<p>{v.points.join(' · ')}</p>{v.source&&<p><a href={`https://commons.wikimedia.org/wiki/File:${v.source}`} target="_blank" rel="noreferrer">{v.author} · Fonte originale</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · Nessuna modifica</p>}</DialogContent></Dialog>
 </>
}
