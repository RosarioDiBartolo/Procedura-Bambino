import { useState } from 'react';
import { sendPlayground } from './simulated-client';
import { playgroundStorageKey } from './mode';
export function Playground() {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('Ho completato tutta la preparazione');
  const [response, setResponse] = useState('Questo è un esempio di risposta simulata. Puoi interrompermi e verificare la chat e le animazioni.');
  const [scenario, setScenario] = useState('none');
  return <aside className="
      border border-solid border-[rgb(139,_172,_158)] fixed z-[80] left-[12px] bottom-[76px]
      w-[min(330px,calc(100vw_-_24px))] rounded-[12px] bg-[#fff] [box-shadow:0_10px_40px_#12382c30] text-[#244b42]
      text-[length:12px]
    " aria-label="Playground locale"><button className="p-3 border-0 border-none border-[currentColor] w-full rounded-[12px] bg-[#dceee5] text-[#244b42] font-[650] text-left" aria-expanded={open} onClick={() => setOpen(value => !value)}>Playground locale · API disattivate {open ? '−' : '+'}</button>{open && <div className="
      p-3 gap-2.5 overflow-auto max-h-[65dvh] grid [&_p]:m-0 [&_p]:text-[length:11px] [&_p]:leading-[1.6]
      [&_label]:gap-[5px] [&_label]:grid [&_textarea]:p-[7px] [&_textarea]:border [&_textarea]:border-solid
      [&_textarea]:border-[rgb(196,_215,_206)] [&_textarea]:w-full [&_textarea]:box-border [&_textarea]:rounded-[6px]
      [&_textarea]:bg-[white] [&_textarea]:text-[#244b42] [&_textarea]:[font-family:inherit]
      [&_textarea]:text-[length:inherit] [&_textarea]:font-[inherit] [&_textarea]:[font-style:inherit]
      [&_textarea]:[font-variant:inherit] [&_textarea]:leading-[inherit] [&_textarea]:min-h-15 [&_textarea]:resize-y
      [&_select]:p-[7px] [&_select]:border [&_select]:border-solid [&_select]:border-[rgb(196,_215,_206)]
      [&_select]:w-full [&_select]:box-border [&_select]:rounded-[6px] [&_select]:bg-[white]
      [&_select]:text-[#244b42] [&_select]:[font-family:inherit] [&_select]:text-[length:inherit]
      [&_select]:font-[inherit] [&_select]:[font-style:inherit] [&_select]:[font-variant:inherit]
      [&_select]:leading-[inherit] [&_button]:p-2 [&_button]:border [&_button]:border-solid
      [&_button]:border-[rgb(180,_209,_195)] [&_button]:rounded-[7px] [&_button]:bg-[#edf5f1]
      [&_button]:text-[#244b42] [&_button]:[font-family:inherit] [&_button]:text-[length:inherit]
      [&_button]:font-[inherit] [&_button]:[font-style:inherit] [&_button]:[font-variant:inherit]
      [&_button]:leading-[inherit] [&_a]:underline
    ">
    <p>Nessun audio reale e nessuna chiamata OpenAI. Il testo libero simula una trascrizione; lo scenario sceglie esplicitamente l’azione da provare.</p>
    <label>Frase utente<textarea value={text} onChange={event => setText(event.target.value)} /></label>
    <label>Scenario<select value={scenario} onChange={event => setScenario(event.target.value)}><option value="none">Solo trascrizione (anche a frammenti)</option><option value="complete">Step operativo completato</option><option value="birth">Nascita dichiarata (da qualsiasi step)</option><option value="temperature">Temperatura alta dalla preparazione</option><option value="hr50">Frequenza cardiaca 50</option></select></label>
    <button disabled={!text.trim()} onClick={() => sendPlayground({ type: 'utterance', text, scenario })}>Invia frase simulata</button>
    <label>Risposta assistente<textarea value={response} onChange={event => setResponse(event.target.value)} /></label><button disabled={!response.trim()} onClick={() => sendPlayground({ type: 'response', text: response })}>Riproduci risposta in chat</button>
    <div className="gap-1.5 flex flex-wrap"><button onClick={() => sendPlayground({ type: 'listening' })}>Utente parla</button><button onClick={() => sendPlayground({ type: 'loading' })}>Caricamento</button><button onClick={() => sendPlayground({ type: 'interrupt' })}>Interrompi</button><button onClick={() => sendPlayground({ type: 'error' })}>Errore 429</button></div>
    <button onClick={() => { sessionStorage.removeItem(playgroundStorageKey); window.location.hash = '/'; window.location.reload(); }}>Azzera sessione di prova</button><a href="/?playground=1#/">Home di prova</a>
    <p>Per tornare alla modalità reale, apri l’indirizzo senza ?playground=1. La sessione di prova usa uno spazio separato.</p>
  </div>}</aside>;
}
