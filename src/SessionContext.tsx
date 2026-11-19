import {createContext,useContext,useEffect,useState,type Dispatch,type SetStateAction,type ReactNode} from 'react'
import {createSession,steps,type Session} from './flow'
const storageKey=()=>'nls-simulation-v1'
function restore():Session{
 try{
  const s=JSON.parse(sessionStorage.getItem(storageKey())??'null')
  const timestamp=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0
  const step=(v:unknown)=>typeof v==='string'&&Object.hasOwn(steps,v)
  if(s&&step(s.step)&&timestamp(s.startedAt)&&timestamp(s.enteredAt)&&['birthAt','finishedAt','lastMedicationAt'].every(k=>s[k]===null||timestamp(s[k]))&&Array.isArray(s.stack)&&s.stack.every(step)&&s.checks&&typeof s.checks==='object'&&!Array.isArray(s.checks)&&Object.values(s.checks).every(v=>typeof v==='boolean')&&Array.isArray(s.events)&&s.events.every((e:any)=>e&&timestamp(e.id)&&timestamp(e.at)&&step(e.step)&&['transition','action','assessment','birth','help','medication','correction','end'].includes(e.type)&&typeof e.text==='string'))return s
 }catch{/* Unavailable storage or obsolete data starts a fresh simulation. */}
 return createSession()
}
const Context=createContext<[Session,Dispatch<SetStateAction<Session>>]|null>(null)
export function SessionProvider({children}:{children:ReactNode}){
 const state=useState(restore)
 useEffect(()=>{try{sessionStorage.setItem(storageKey(),JSON.stringify(state[0]))}catch{/* The simulation remains usable in memory. */}},[state[0]])
 return <Context.Provider value={state}>{children}</Context.Provider>
}
export function useSession(){const value=useContext(Context);if(!value)throw new Error('SessionProvider missing');return value}
