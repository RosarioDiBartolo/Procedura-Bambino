import {useState} from 'react'
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@nls/ui/components/dialog'
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
  <figure className={`procedure-visual ${v.image?'has-clinical-image':''}`} aria-label={`Guida visiva: ${v.title}`}>
   <div className="procedure-visual-heading"><span>GUIDA VISIVA</span><button type="button" onClick={()=>setOpen(true)}>Ingrandisci immagine ↗</button></div>
   <div className="procedure-visual-body"><div className="procedure-artwork">{v.image?<img src={v.image} alt={v.alt} width="800" height="600"/>:drawing}</div><figcaption><strong>{v.title}</strong><ol>{v.points.map((point,i)=><li key={point}><span>{i+1}</span>{point}</li>)}</ol></figcaption></div>
   {v.source&&<div className="image-credit"><a href={`https://commons.wikimedia.org/wiki/File:${v.source}`} target="_blank" rel="noreferrer">{v.author} · Wikimedia Commons</a><span> · </span><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a><span> · Immagine originale, non modificata.{v.image===simulation?' Simulazione su manichino.':v.image===airway?' Confronto anatomico; non rappresenta la tecnica esecutiva.':''}</span></div>}
  </figure>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="procedure-image-dialog"><DialogHeader><DialogTitle>{v.title}</DialogTitle></DialogHeader>{v.image?<img src={v.image} alt={v.alt}/>:drawing}<p>{v.points.join(' · ')}</p>{v.source&&<p><a href={`https://commons.wikimedia.org/wiki/File:${v.source}`} target="_blank" rel="noreferrer">{v.author} · Fonte originale</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · Nessuna modifica</p>}</DialogContent></Dialog>
 </>
}
