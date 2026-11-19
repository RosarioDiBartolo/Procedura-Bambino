import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@nls/ui/components/button';

export const stepAudioDelayMs = 500;
const preference = 'nido-recorded-voice-enabled';
export function RecordedVoice({ clip, visit }: { clip: string; visit: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activated = useRef(false);
  const [enabled, setEnabled] = useState(() => { try { return window.localStorage.getItem(preference) === 'true'; } catch { return false; } });
  const [status, setStatus] = useState('');
  const [playing, setPlaying] = useState(false);
  const stop = () => {
    if (pending.current !== null) { clearTimeout(pending.current); pending.current = null; }
    generation.current++;
    if (audio.current) { audio.current.pause(); audio.current.currentTime = 0; }
    setPlaying(false);
  };
  const play = () => {
    stop();
    const current = audio.current;
    if (!current) return;
    const token = generation.current;
    setStatus('Caricamento audio…');
    setPlaying(true);
    void current.play().then(() => {
      if (token === generation.current) setStatus('Lettura in corso');
    }).catch(() => {
      if (token === generation.current) { setPlaying(false); setStatus('Audio non avviato. Premi Ascolta per riprovare.'); }
    });
  };
  useLayoutEffect(() => {
    const current = new Audio(`${import.meta.env.BASE_URL}audio/qwen/${clip}.wav`);
    current.preload = 'none';
    audio.current = current;
    current.onended = () => { setPlaying(false); setStatus('Lettura terminata'); };
    current.onerror = () => { generation.current++; setPlaying(false); setStatus('Registrazione non disponibile. Puoi continuare leggendo lo schermo.'); };
    setStatus('');
    setPlaying(false);
    if (enabled && activated.current) {
      setStatus('Lettura tra un momento…');
      setPlaying(true);
      pending.current = setTimeout(() => { pending.current = null; play(); }, stepAudioDelayMs);
    }
    return () => { if (pending.current !== null) { clearTimeout(pending.current); pending.current = null; } generation.current++; current.pause(); current.onended = null; current.onerror = null; current.removeAttribute('src'); current.load(); audio.current = null; };
  }, [clip, visit]);
  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try { window.localStorage.setItem(preference, String(next)); } catch { /* Controls remain usable without storage. */ }
    if (next) { activated.current = true; play(); }
    else { stop(); setStatus('Guida vocale disattivata'); }
  }
  return <div role="group" aria-label="Controlli vocali" className="mr-auto flex min-w-0 flex-wrap items-center gap-2">
    <Button variant="outline" aria-pressed={enabled} onClick={toggle}>{enabled ? 'Disattiva voce' : 'Attiva voce'}</Button>
    <Button variant="outline" disabled={!enabled} onClick={() => { activated.current = true; play(); }}>{playing ? 'Ripeti' : 'Ascolta / Ripeti'}</Button>
    <Button variant="outline" disabled={!playing} onClick={() => { stop(); setStatus('Lettura interrotta'); }}>Interrompi</Button>
    <span role="status" className="sr-only">{status || (enabled ? 'Premi Ascolta per avviare la lettura' : 'Guida vocale disattivata')}</span>
  </div>;
}
