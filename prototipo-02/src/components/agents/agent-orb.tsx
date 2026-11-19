import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'motion/react';
import { VoiceOrb } from './voice-orb';
import type { VoiceState } from '../../assistant/realtime-client';
import { cn } from '@nls/ui/lib/utils';

type AgentState = VoiceState | 'error' | 'interrupted';
const palettes: Record<AgentState, readonly [string, string, string]> = {
  off: ['#7eaaa2', '#dcece4', '#476d71'],
  connecting: ['#719ba8', '#e0f4fa', '#345c76'],
  listening: ['#287f73', '#d0f4dc', '#184d59'],
  analyzing: ['#4d79a3', '#dfebff', '#394d80'],
  speaking: ['#258978', '#fff0c6', '#194f63'],
  interrupted: ['#789ca0', '#e3efeb', '#536c7d'],
  error: ['#b87562', '#ffe6c1', '#874a56'],
};

export function AgentOrb({ state, userSpeaking, microphone, error, interrupted, inputAnalyser, outputAnalyser, className }:
  { state: VoiceState; userSpeaking: boolean; microphone: boolean; error?: string; interrupted?: boolean;
    inputAnalyser?: AnalyserNode | null; outputAnalyser?: AnalyserNode | null; className?: string }) {
  const status: AgentState = error ? 'error' : interrupted ? 'listening' : state;
  const inactive = state === 'off' || status === 'error';
  const waiting = !inactive && state === 'listening' && !userSpeaking;
  const activity = useMotionValue(0);
  const reduced = useReducedMotion();
  useAnimationFrame(time => {
    const t = time / 1000;
    const amount = status === 'connecting' ? .15 + .08 * Math.sin(t * 2)
      : status === 'analyzing' ? .26 + .12 * Math.sin(t * 3)
      : status === 'speaking' ? .45 : userSpeaking ? .35 : waiting ? .1 + .05 * Math.sin(t * 1.7) : microphone ? .08 : 0;
    activity.set(reduced ? 0 : amount);
  });
  const analyser = userSpeaking || state === 'listening' ? inputAnalyser : state === 'speaking' ? outputAnalyser : null;
  const scale = inactive ? .62 : status === 'connecting' ? .94 : status === 'speaking' ? 1.04 : 1;
  return <motion.div className={cn(className, inactive && 'saturate-[.35]')}
    animate={{ scale: waiting && !reduced ? [.98, 1.025, .98] : scale, opacity: inactive ? .4 : 1 }}
    transition={waiting && !reduced ? { scale: { duration: 3.4, repeat: Infinity, ease: [.77, 0, .175, 1] }, opacity: { duration: .2 } }
      : { duration: reduced ? 0 : .3, ease: [.23, 1, .32, 1] }}
    data-agent-state={userSpeaking ? 'user-speaking' : status}
    data-orbit-state={state === 'speaking' && !userSpeaking ? 'speaking' : userSpeaking || state === 'connecting' || state === 'analyzing' ? 'resting' : 'idle'}
    aria-hidden="true">
    <VoiceOrb activity={activity} analyser={analyser} colors={palettes[status]}
      active={status !== 'off' && status !== 'error'}
      speed={status === 'analyzing' ? 1.25 : status === 'connecting' ? .7 : .5}
      className="size-full" labels={{ unavailable: '' }} />
  </motion.div>;
}


