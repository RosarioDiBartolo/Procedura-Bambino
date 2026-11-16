import {useEffect,useRef,useState} from 'react'
import {Button} from '@nls/ui/components/button'
import { Volume2, Square } from "@nls/ui/icons8";
import type {Step} from './flow'
import {recordingUrl} from './recordings'

export function narration(step:Step){
 const prompts:Record<string,string>={birth:'Quando avviene la nascita, premi Nascita ora e prosegui.',initial:'Seleziona il caso: tutte le condizioni presenti, oppure almeno una condizione assente.',respiration:'Seleziona il caso: apnea o gasping oppure frequenza cardiaca inferiore a 100; oppure respiro presente e frequenza cardiaca almeno 100.',distress:'Seleziona il caso: respiro difficoltoso o cianosi persistente; oppure nessuna delle due condizioni.',hr100:'Seleziona il caso: frequenza cardiaca inferiore a 100, oppure almeno 100.',hr60:'Conferma con il team la ventilazione efficace prima delle compressioni. Seleziona il caso: frequenza cardiaca inferiore a 60, oppure almeno 60. Se la ventilazione non è efficace, torna ai correttivi.','advanced-hr':'Seleziona il caso: frequenza cardiaca inferiore a 60, oppure almeno 60.'}
 const text=[step.title,step.subtitle,step.actions?.length?`Interventi: ${step.actions.join('. ')}.`:'',step.id==='cord'?'Clampaggio e milking: attendere almeno 60 secondi prima di clampare; considerare milking nei neonati depressi tra 35 e 42 settimane. Non ritardare gli interventi necessari: concorda la gestione con il team.':'',prompts[step.id]??(step.next?'Al termine, premi Prosegui.':'')].filter(Boolean).join('. ')
 return text.replace(/SpO₂/g,'saturazione periferica di ossigeno').replace(/O₂/g,'ossigeno').replace(/FC/g,'frequenza cardiaca').replace(/<\s*(\d+)\s*\/min/g,'inferiore a $1 battiti al minuto').replace(/PPV/g,'ventilazione a pressione positiva').replace(/ECG/g,'elettrocardiogramma').replace(/CVO/g,'catetere venoso ombelicale').replace(/\bIO\b/g,'accesso intraosseo').replace(/3–5 min/g,'3 a 5 minuti').replace(/100%/g,'100 per cento').replace(/ · /g,'. ')
}

export function VoiceGuide({step,finished,sessionKey,blocked}:{step:Step;finished:boolean;sessionKey:number;blocked:boolean}){
 const recording=recordingUrl(step.id)
 const audioRef=useRef<HTMLAudioElement|null>(null)
 const browserSupported=typeof window!=='undefined'&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window
 const supported=!!recording||browserSupported
 const [enabled,setEnabled]=useState(false)
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([])
 const [voiceId,setVoiceId]=useState('')
 const [speaking,setSpeaking]=useState(false)
 const [error,setError]=useState('')
 const generation=useRef(0)
 const selected=voices.find(v=>v.voiceURI===voiceId)??voices[0]
 function stop(){generation.current++;audioRef.current?.pause();audioRef.current=null;if(browserSupported)window.speechSynthesis.cancel();setSpeaking(false)}
 function speak(){
  if(!supported||finished||blocked)return
  stop();setError('')
  if(recording){
   const token=generation.current
   const audio=new Audio(recording);audioRef.current=audio
   const failed=()=>{if(token===generation.current){setSpeaking(false);setError('Audio non disponibile. Premi Riascolta procedura per riprovare.')}}
   audio.onplaying=()=>{if(token===generation.current)setSpeaking(true)}
   audio.onended=()=>{if(token===generation.current)setSpeaking(false)}
   audio.onerror=failed
   setSpeaking(true)
   audio.play().catch(failed)
   return
  }
  if(!selected){setError('Nessuna voce italiana disponibile. Installa una voce italiana nelle impostazioni del dispositivo.');return}
  const token=generation.current
  const utterance=new SpeechSynthesisUtterance(narration(step))
  utterance.lang='it-IT';utterance.voice=selected;utterance.rate=0.95
  utterance.onstart=()=>{if(token===generation.current)setSpeaking(true)}
  utterance.onend=()=>{if(token===generation.current)setSpeaking(false)}
  utterance.onerror=event=>{if(token===generation.current){setSpeaking(false);if(!['canceled','interrupted'].includes(event.error))setError('Lettura non disponibile. Riprova con Riascolta procedura o scegli un’altra voce.')}}
  window.speechSynthesis.speak(utterance)
 }
 useEffect(()=>{
  if(!browserSupported)return
  function refresh(){setVoices(window.speechSynthesis.getVoices().filter(v=>/^it(?:-|_)/i.test(v.lang)||v.lang==='it').sort((a,b)=>Number(/natural|neural|online/i.test(b.name))-Number(/natural|neural|online/i.test(a.name))))}
  refresh();window.speechSynthesis.addEventListener('voiceschanged',refresh)
  return()=>{window.speechSynthesis.removeEventListener('voiceschanged',refresh);generation.current++;window.speechSynthesis.cancel()}
 },[browserSupported])
 useEffect(()=>{if(enabled&&!finished&&!blocked)speak();else stop();return()=>{generation.current++;audioRef.current?.pause();audioRef.current=null;if(browserSupported)window.speechSynthesis.cancel()}
 // Narration changes only with the step, session, voice or explicit controls.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step.id,sessionKey,enabled,finished,blocked,selected?.voiceURI,recording])
 return <section className="voice-guide" aria-label="Assistente vocale"><div className="voice-guide-heading"><Volume2 size={20}/><div><strong>Assistente vocale</strong><p>Legge interventi e casi disponibili. Seleziona sullo schermo la situazione osservata dal team.</p></div></div><div className="voice-guide-controls"><Button variant={enabled?'default':'outline'} disabled={!supported||finished} aria-pressed={enabled} onClick={()=>setEnabled(v=>!v)}>{enabled?'Disattiva guida vocale':'Attiva guida vocale'}</Button><Button variant="outline" disabled={!supported||(!recording&&!selected)||finished||blocked} onClick={speak}><Volume2 size={16}/>Riascolta procedura</Button><Button variant="ghost" disabled={!speaking} onClick={stop}><Square size={14}/>Interrompi</Button></div>{!recording&&browserSupported&&<label className="voice-select">Voce italiana<select aria-label="Voce italiana" value={selected?.voiceURI??''} onChange={e=>setVoiceId(e.target.value)}>{!voices.length&&<option value="">Nessuna voce italiana disponibile</option>}{voices.map(v=><option value={v.voiceURI} key={v.voiceURI}>{v.name}{v.localService?' · dispositivo':' · online'}</option>)}</select></label>}<p className="voice-guide-status" role="status">{!supported?'Lettura vocale non supportata da questo browser.':error|| (speaking?'Lettura in corso…':enabled?'Guida attiva: lettura automatica a ogni passaggio.':'Attiva la guida oppure riascolta questo passaggio.')} {recording?' Voce Qwen · audio incluso nell’app.':' Lettura aggiornata del browser: la registrazione di questo passaggio si riferisce alla precedente interfaccia.'}</p></section>
}
