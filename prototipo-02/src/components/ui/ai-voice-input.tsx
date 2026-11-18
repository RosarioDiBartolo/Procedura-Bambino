"use client";

import { Mic, Square } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@nls/ui/lib/utils';

export interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
  recording?: boolean;
  analyser?: AnalyserNode | null;
  disabled?: boolean;
  connecting?: boolean;
}

/** Continuous listening follows the real microphone state; the component never opens a second stream. */
export function AIVoiceInput({ onStart, onStop, visualizerBars = 48, demoMode = false,
  demoInterval = 3000, className, recording, analyser, disabled = false, connecting = false }: AIVoiceInputProps) {
  const [localRecording, setLocalRecording] = useState(false);
  const [demo, setDemo] = useState(demoMode);
  const active = recording ?? localRecording;
  const [time, setTime] = useState(0);
  const count = Math.max(12, Math.min(64, Math.round(visualizerBars)));
  const [levels, setLevels] = useState<number[]>([]);
  const startedAt = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) { setTime(0); return; }
    startedAt.current = performance.now();
    const timer = setInterval(() => setTime(Math.floor((performance.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active || !analyser || reduced) { setLevels([]); return; }
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const timer = setInterval(() => {
      analyser.getByteFrequencyData(samples);
      setLevels(Array.from({ length: count }, (_, i) => Math.max(.12, samples[Math.floor(i * samples.length / count)] / 255)));
    }, 80);
    return () => clearInterval(timer);
  }, [active, analyser, count, reduced]);

  useEffect(() => {
    if (!demo || recording !== undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      setLocalRecording(true);
      timer = setTimeout(() => { setLocalRecording(false); timer = setTimeout(run, 1000); }, demoInterval);
    };
    timer = setTimeout(run, 100);
    return () => clearTimeout(timer);
  }, [demo, demoInterval, recording]);

  function toggle() {
    setDemo(false);
    if (active) onStop?.(Math.floor((performance.now() - startedAt.current) / 1000));
    else onStart?.();
    if (recording === undefined) setLocalRecording(!active);
  }

  return <div className={cn('w-full py-3 [@media(max-height:700px)]:py-2', className)}>
    <div className="
      relative mx-auto flex w-full max-w-xl flex-col items-center gap-2 [@media(max-height:700px)]:grid
      [@media(max-height:700px)]:grid-cols-[40px_minmax(0,1fr)] [@media(max-height:700px)]:gap-x-3
      [@media(max-height:700px)]:gap-y-1
    ">
      <button type="button" onClick={toggle} disabled={disabled || connecting}
        aria-label={active ? 'Disattiva microfono' : 'Attiva microfono'} aria-pressed={active}
        className={cn(`
      group flex size-12 items-center justify-center rounded-xl transition-colors duration-150
      focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary
      disabled:cursor-not-allowed disabled:opacity-50 [@media(max-height:700px)]:row-span-3
      [@media(max-height:700px)]:size-10
    `,
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/10')}>
        {connecting ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
          : active ? <Square className="size-5 motion-safe:animate-[spin_3s_linear_infinite]" /> : <Mic className="size-6" />}
      </button>
      <span className={cn('font-mono text-xs tabular-nums [@media(max-height:700px)]:col-start-2', active ? 'text-primary' : 'text-muted-foreground')}>
        {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}
      </span>
      <div aria-hidden="true" className="flex h-5 w-full max-w-64 items-center justify-center gap-0.5 [@media(max-height:700px)]:col-start-2 [@media(max-height:700px)]:h-4">
        {Array.from({ length: count }, (_, i) => <motion.div key={i}
          className={cn('h-full w-0.5 shrink-0 rounded-full', active ? 'bg-primary/60' : 'bg-primary/15')}
          animate={{ scaleY: active && !reduced ? levels[i] ?? .15 : .12 }} transition={{ duration: reduced ? 0 : .15 }} />)}
      </div>
      <p className="text-center text-xs text-muted-foreground [@media(max-height:700px)]:col-start-2 [@media(max-height:700px)]:text-left [@media(max-height:700px)]:text-[10px]">
        {connecting ? 'Collegamento al microfono…' : active ? 'Ascolto continuo · parla quando vuoi' : 'Tocca il microfono per parlare'}
      </p>
    </div>
  </div>;
}
