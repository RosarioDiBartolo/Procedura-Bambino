import { createElement, useContext, useLayoutEffect, useMemo, useRef, type ElementType } from 'react';
import { gsap } from 'gsap';
import { AppearanceContext } from './AppearanceContext';
/** React Bits TextType adapted for fixed procedure copy: one pass, no deletion or deliberate typos. */
export default function TextType({ text, as = 'span', typingSpeed = 85, initialDelay = 0, typeEffect = 'fade', showCursor = false, className = '' }: { text: string; as?: ElementType; typingSpeed?: number; initialDelay?: number; typeEffect?: 'none' | 'fade' | 'blur' | 'rise'; showCursor?: boolean; className?: string }) {
  const root = useRef<HTMLElement>(null);
  const { enabled, replayKey, sequential } = useContext(AppearanceContext);
  const chars = useMemo(() => text.match(/\S+\s*|\s+/g) ?? [], [text]);
  useLayoutEffect(() => {
    if (sequential || !root.current || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      const targets = root.current!.querySelectorAll('.text-type__char');
      if (!targets.length) return;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) { gsap.set(targets, { opacity: 1 }); return; }
      gsap.set(targets, { opacity: 0 });
      if (!enabled) return;
      gsap.fromTo(targets, { opacity: 0, ...(typeEffect === 'blur' ? { filter: 'blur(4px)' } : {}), ...(typeEffect === 'rise' ? { top: '.35em' } : {}) }, { opacity: 1, filter: 'blur(0px)', top: 0, duration: typeEffect === 'none' ? 0 : .32, stagger: typingSpeed / 1000, delay: initialDelay / 1000, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, [text, chars, enabled, replayKey, sequential, typingSpeed, initialDelay, typeEffect]);
  if (typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return createElement(as, { className: `text-type relative whitespace-pre-wrap [.case-conditions_li>&]:w-auto [.case-conditions_li>&]:grow [.case-conditions_li>&]:shrink [.case-conditions_li>&]:basis-[0%] [.case-conditions_li>&]:text-left [.case-conditions_li>&]:text-[inherit] ${className}` }, text);
  return createElement(as, { ref: root, className: `text-type relative whitespace-pre-wrap [.case-conditions_li>&]:w-auto [.case-conditions_li>&]:grow [.case-conditions_li>&]:shrink [.case-conditions_li>&]:basis-[0%] [.case-conditions_li>&]:text-left [.case-conditions_li>&]:text-[inherit] ${className}`, 'data-typing-speed': typingSpeed },
    <span className="p-0 m-[-1px] overflow-hidden border-0 border-none border-[currentColor] absolute w-[1px] h-[1px] [clip:rect(0,0,0,0)] whitespace-nowrap">{text}</span>,
    <span className="text-type__content" aria-hidden="true">{chars.map((char, index) => <span className="
      text-type__char relative motion-reduce:opacity-[1]! motion-reduce:[filter:none]! motion-reduce:top-0!
      [&::before]:[content:attr(data-char)] [&::before]:whitespace-pre-wrap text-type__word
    " data-char={char} key={index} />)}{showCursor && <span className="
      inline-block w-0.5 h-[1em] ml-[3px] [background:currentColor] [vertical-align:-.15em]
      [animation:text-cursor-blink_1s_steps(2)_infinite] motion-reduce:[animation:none]
    " />}</span>);
}
