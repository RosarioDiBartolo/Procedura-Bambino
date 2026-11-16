import {describe,it,expect} from 'vitest'
import {createSession,decide,decisionCases,selectCase,move,back,record,formatTime,secondsFrom,steps,type StepId} from './flow'
describe('Trasposizione del flow-chart SIN',()=>{
 it('distingue i tre requisiti del primo bivio',()=>{expect(decide('initial',{term:true,tone:true,breathing:true})).toBe('skin');for(const key of ['term','tone','breathing'])expect(decide('initial',{term:true,tone:true,breathing:true,[key]:false})).toBe('first-actions');expect(()=>decide('initial',{term:true})).toThrow()})
 it('segue OR fra apnea/gasping e FC <100, compreso il confine a 100',()=>{expect(decide('respiration',{apnea:true,hr:130})).toBe('ppv');expect(decide('respiration',{apnea:false,hr:99})).toBe('ppv');expect(decide('respiration',{apnea:false,hr:100})).toBe('distress')})
 it('segue entrambi i rami della difficoltà respiratoria',()=>{expect(decide('distress',{distress:true})).toBe('distress-support');expect(decide('distress',{distress:false})).toBe('skin')})
 it('non tratta come zero la FC mancante e rifiuta dati non validi',()=>{for(const hr of [undefined,NaN,Infinity,-1,351,60.5])expect(()=>decide('hr100',{hr})).toThrow();expect(decide('hr100',{hr:0})).toBe('correctives');expect(()=>decide('respiration',{hr:120})).toThrow()})
 it('dopo PPV rimanda a correttivi o post-rianimazione secondo il poster',()=>{expect(decide('hr100',{hr:99})).toBe('correctives');expect(decide('hr100',{hr:100})).toBe('post')})
 it('verifica efficacia prima delle compressioni e il ritorno del ramo NO',()=>{expect(()=>decide('hr60',{hr:59})).toThrow(/ventilazione efficace/);expect(decide('hr60',{hr:59,effective:true})).toBe('compressions');expect(decide('hr60',{hr:60})).toBe('hr100')})
 it('non inventa il ramo avanzato NO non disegnato dal poster',()=>{expect(decide('advanced-hr',{hr:59})).toBe('medication');expect(decide('advanced-hr',{hr:60})).toBe('recovery-review')})
 it('mantiene il loop farmaco → FC <60/min e i tre box',()=>{expect(steps.medication.next).toBe('advanced-hr');expect(steps['distress-support'].next).toBe('post');expect(steps.correctives.box).toBe('mrsopa');expect(steps.medication.box).toBe('doppes')})
 it('ogni transizione dichiarata ha una destinazione esistente',()=>{for(const step of Object.values(steps))if(step.next)expect(steps[step.next]).toBeDefined()})
})
describe('Sessione e tempo',()=>{
 it('il tempo dalla nascita resta sconosciuto prima della registrazione',()=>{const s=createSession(1000);expect(s.birthAt).toBeNull();expect(secondsFrom(s.birthAt,10000)).toBeNull();expect(formatTime(null)).toBe('—:—');expect(formatTime(185)).toBe('03:05')})
 it('le correzioni conservano il registro e non sono cancellazioni nascoste',()=>{let s=createSession(1000);s=move(s,'birth',2000,'Preparazione completata');s=move(s,'cord',3000,'Nascita dichiarata');s=back(s,4000);expect(s.step).toBe('birth');expect(s.events).toHaveLength(3);expect(s.events.at(-1)?.type).toBe('correction');expect(s.events.map(e=>e.id)).toEqual([1,2,3])})
 it('il timer del farmaco non parte da una transizione di fase',()=>{let s=createSession(1000);s=move(s,'medication',2000,'Ingresso fase');expect(s.lastMedicationAt).toBeNull();s=record({...s,lastMedicationAt:3000},{at:3000,step:'medication',type:'medication',text:'Somministrazione confermata'});expect(secondsFrom(s.lastMedicationAt,183000)).toBe(180)})
 it('una sequenza completa mantiene distinti valutazioni, azioni e tempi',()=>{let s=createSession(0);for(const target of ['birth','cord','initial','first-actions','respiration','ppv','hr100','correctives','hr60','compressions','advanced-hr','medication'] as StepId[])s=move(s,target,s.enteredAt+1000,target);expect(s.events).toHaveLength(12);expect(s.birthAt).toBeNull();expect(s.step).toBe('medication')})
})

 describe('Scelta dei casi senza trascrizione dei parametri',()=>{
 it('espone due casi per ogni nodo decisionale e destinazioni valide',()=>{for(const step of Object.values(steps)){if(step.kind!=='decision')continue;const cases=decisionCases[step.id]!;expect(cases).toHaveLength(2);for(const c of cases)expect(steps[c.next]).toBeDefined()}})
 it('mantiene aggregazione AND iniziale e OR respiratorio',()=>{expect(selectCase('initial','yes')).toBe('skin');expect(selectCase('initial','no')).toBe('first-actions');expect(selectCase('respiration','yes')).toBe('ppv');expect(selectCase('respiration','no')).toBe('distress')})
 it('non aggira la conferma di ventilazione efficace',()=>{expect(()=>selectCase('hr60','yes')).toThrow(/ventilazione efficace/);expect(selectCase('hr60','yes',true)).toBe('compressions');expect(selectCase('hr60','no')).toBe('hr100')})
 it('mantiene i rami di rivalutazione e il limite del ramo avanzato',()=>{expect(selectCase('hr100','no')).toBe('post');expect(selectCase('advanced-hr','yes')).toBe('medication');expect(selectCase('advanced-hr','no')).toBe('recovery-review');expect(()=>selectCase('preparation','yes')).toThrow()})
 })
