import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {VoiceGuide,narration} from './VoiceGuide'
import {steps} from './flow'
// This suite exercises browser speech; bundled recordings have a separate playback path.
vi.mock('./recordings',()=>({recordingUrl:()=>undefined}))

afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('Guida vocale',()=>{
 it('propone casi senza chiedere la trascrizione dei parametri',()=>{expect(narration(steps.hr60)).toContain('inferiore a 60 battiti al minuto');expect(narration(steps.respiration)).toContain('Seleziona il caso');for(const step of Object.values(steps))expect(narration(step)).not.toMatch(/Inserisci|trascrivi/i);expect(narration(steps.cord)).toContain('almeno 60 secondi')})
 it('legge su attivazione, cancella al cambio passo e consente il riascolto',async()=>{
  const speak=vi.fn(),cancel=vi.fn()
  vi.stubGlobal('speechSynthesis',{speak,cancel,getVoices:()=>[{voiceURI:'it',lang:'it-IT',name:'Italiano Natural',localService:true}],addEventListener:vi.fn(),removeEventListener:vi.fn()})
  vi.stubGlobal('SpeechSynthesisUtterance',class {text:string;constructor(text:string){this.text=text}})
  const user=userEvent.setup()
  const view=render(<VoiceGuide step={steps.preparation} finished={false} blocked={false} sessionKey={1}/>)
  expect(speak).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button',{name:'Attiva guida vocale'}))
  expect(speak).toHaveBeenCalledTimes(1)
  view.rerender(<VoiceGuide step={steps.birth} finished={false} blocked={false} sessionKey={1}/>)
  expect(speak).toHaveBeenCalledTimes(2)
  expect(speak.mock.calls[1][0].text).toContain('Nascita ora')
  await user.click(screen.getByRole('button',{name:'Riascolta procedura'}))
  expect(speak).toHaveBeenCalledTimes(3)
  view.rerender(<VoiceGuide step={steps.birth} finished={true} blocked={false} sessionKey={1}/>)
  expect(cancel).toHaveBeenCalled()
  expect((screen.getByRole('button',{name:'Riascolta procedura'}) as HTMLButtonElement).disabled).toBe(true)
 })
})
