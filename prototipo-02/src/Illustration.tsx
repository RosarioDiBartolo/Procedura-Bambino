import type {StepId} from './flow'

// Each illustration is an independent SVG: replace the file to change its artwork.
const assets=import.meta.glob('./assets/illustrations/*.svg',{eager:true,query:'?url',import:'default'}) as Record<string,string>
export const stepArt:Record<StepId,string>={preparation:'team',birth:'birth',cord:'cord',initial:'assessment',skin:'skin','first-actions':'warmth',respiration:'breathing',distress:'distress','distress-support':'oxygen',ppv:'ventilation',hr100:'heart',correctives:'mask',hr60:'heart',compressions:'compressions','advanced-hr':'heart',medication:'medication','recovery-review':'assessment',post:'care'}
export function artFor(text:string):string{
 const t=text.toLowerCase()
 if(/counseling|gravidanza|termine/.test(t))return 'pregnancy'
 if(/briefing|debriefing|team/.test(t))return 'team'
 if(/checklist|materiale|strumentazione/.test(t))return 'checklist'
 if(/cordone|clamp/.test(t))return 'cord'
 if(/skin/.test(t))return 'skin'
 if(/temperatura|calore/.test(t))return 'warmth'
 if(/asciug/.test(t))return 'dry'
 if(/tono|stimol/.test(t))return 'tone'
 if(/riposizion|posizione/.test(t))return 'position'
 if(/secrezion|ostruzione|aspira/.test(t))return 'suction'
 if(/bocca/.test(t))return 'mouth'
 if(/compression/.test(t))return 'compressions'
 if(/adrenalina/.test(t))return 'medication'
 if(/ipovolemia|cvo|io\b/.test(t))return 'access'
 if(/ecg|cardiaca|fc /.test(t))return 'heart'
 if(/spo|satur/.test(t))return 'saturation'
 if(/o₂|ossigeno/.test(t))return 'oxygen'
 if(/pneumotorace/.test(t))return 'lungs'
 if(/stomaco/.test(t))return 'stomach'
 if(/tubo|laringea|alternativa|dislocazione/.test(t))return 'airway'
 if(/maschera|correttivi/.test(t))return 'mask'
 if(/pression|ppv|cpap|ventilazione/.test(t))return 'ventilation'
 if(/cianosi|difficoltoso/.test(t))return 'distress'
 if(/respira|piange|apnea|gasping|respiro/.test(t))return 'breathing'
 if(/doppes/.test(t))return 'checklist'
 return 'care'
}
export function Illustration({name,large=false}:{name:string;large?:boolean}){
 return <img className={large?'step-illustration':'detail-illustration'} src={assets[`./assets/illustrations/${name}.svg`]} alt="" aria-hidden="true" width={large?240:64} height={large?180:64}/>
}
