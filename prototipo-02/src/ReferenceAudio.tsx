import {useEffect,useRef} from 'react'
import {recordingUrl} from './recordings'

export function ReferenceAudio({id}:{id:string}){
 const ref=useRef<HTMLAudioElement>(null)
 useEffect(()=>{const audio=ref.current;return()=>{audio?.pause()}},[id])
 const src=recordingUrl(id)
 return src?<div className="reference-audio"><span>Ascolta la guida · voce Qwen</span><audio key={id} ref={ref} controls preload="none" src={src} aria-label="Lettura del supporto operativo"/></div>:null
}
