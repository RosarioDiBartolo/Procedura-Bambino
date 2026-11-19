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
 return <img className={large?`
      step-illustration w-full h-auto max-w-[240px] rounded-[20px] max-[650px]:rounded-[12px]
      [.procedure-artwork>&]:w-full [.procedure-artwork>&]:max-w-none [.procedure-artwork>&]:h-70
      [.procedure-artwork>&]:object-contain [.procedure-image-dialog>&]:max-w-none
      [.procedure-image-dialog>&]:h-[55vh] max-[1150px]:[.procedure-artwork>&]:h-70
      max-[650px]:[.procedure-artwork>&]:h-60 [.compact-step-image>&]:max-w-none [.compact-step-image>&]:w-full
      [.compact-step-image>&]:h-full [.compact-step-image>&]:max-h-none [.compact-step-image>&]:object-cover
      [.case-art_&]:h-full [.case-art_&]:max-h-[180px] [.case-art_&]:w-full [.case-art_&]:max-w-[240px]
      [.case-art_&]:object-contain [.compact-completion_&]:m-auto [.compact-completion_&]:h-37.5
      [.compact-completion_&]:w-50 [.step-photo-frame_.compact-step-image>&]:w-full
      [.step-photo-frame_.compact-step-image>&]:h-23 [.step-photo-frame_.compact-step-image>&]:max-h-[92px]
      [.step-photo-frame_.compact-step-image>&]:object-contain
      max-[699px]:[.step-photo-frame_.compact-step-image>&]:h-21.5
      max-[699px]:[.step-photo-frame_.compact-step-image>&]:max-h-[86px]
    `:`
      w-16 h-12 object-contain shrink-0 rounded-[9px] [.reference-checklist_&]:w-20 [.reference-checklist_&]:h-15
      max-[650px]:[.reference-checklist_&]:w-16 max-[650px]:[.reference-checklist_&]:h-12
      [.animated-intervention-list_&]:w-13 [.animated-intervention-list_&]:h-[39px] [.many-actions_&]:w-11.5
      [.many-actions_&]:h-8.5 [@media(min-width:700px)_and_(max-width:950px)]:[.animated-intervention-list_&]:hidden
      max-[699px]:[.animated-intervention-list_&]:w-11 max-[699px]:[.animated-intervention-list_&]:h-[33px]
    `} src={assets[`./assets/illustrations/${name}.svg`]} alt="" aria-hidden="true" width={large?240:64} height={large?180:64}/>
}
