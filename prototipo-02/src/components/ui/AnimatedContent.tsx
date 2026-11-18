import { useLayoutEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { gsap } from 'gsap';
/** React Bits AnimatedContent adapted to step mounting and explicit replay instead of scrolling. */
export default function AnimatedContent({ children, sequentialText = false, enabled = true, replayKey = '', distance = 24, direction = 'vertical', reverse = false, duration = .65, ease = 'power3.out', initialOpacity = 0, scale = 1, blur = 0, delay = 0, stagger = .075, targets, className = '', style }: { children: ReactNode; sequentialText?: boolean; enabled?: boolean; replayKey?: string; distance?: number; direction?: 'vertical' | 'horizontal'; reverse?: boolean; duration?: number; ease?: string; initialOpacity?: number; scale?: number; blur?: number; delay?: number; stagger?: number; targets?: string; className?: string; style?: CSSProperties }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!root.current || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      const nodes = targets ? Array.from(root.current!.querySelectorAll(targets)) : Array.from(root.current!.children);
      if (!nodes.length) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const axis = direction === 'horizontal' ? 'x' : 'y';
      const from = { [axis]: distance * (reverse ? -1 : 1), opacity: initialOpacity, scale, filter: `blur(${blur}px)` };
      gsap.set(nodes, from);
      if (sequentialText) {
        const words = root.current!.querySelectorAll('.text-type__word');
        gsap.set(words, { opacity: 0 });
        if (!enabled) return;
        const timeline = gsap.timeline({ delay });
        const surfaces = new Set(nodes);
        const sequence = root.current!.querySelectorAll(`${targets || ':scope > *'}, .text-type`);
        let cursor = 0;
        sequence.forEach(node => {
          if (surfaces.has(node)) {
            const photo = node.matches('.step-photo-frame, .compact-birth>.compact-step-image') ? node.querySelector('img') : null;
            if (photo) {
              // Keep the frame fixed; settle the photo inside its existing rounded crop.
              gsap.set(node, { [axis]: 0, scale: 1, filter: 'none' });
              gsap.set(photo, { transform: 'translateY(10px) scale(1.045)', transformOrigin: '50% 50%' });
              timeline.to(node, { opacity: 1, duration: .3, ease: 'power3.out' }, cursor);
              timeline.to(photo, { transform: 'translateY(0px) scale(1)', duration: .3, ease: 'power3.out' }, cursor);
              return;
            }
            timeline.to(node, { [axis]: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: .3, ease }, cursor);
          }
          if (node.matches('.text-type')) {
            let ancestor: Element | null = node;
            while (ancestor && ancestor !== root.current && getComputedStyle(ancestor).display !== 'none') ancestor = ancestor.parentElement;
            if (ancestor && ancestor !== root.current) { gsap.set(node.querySelectorAll('.text-type__word'), { opacity: 1 }); return; }
            const tokens = node.querySelectorAll('.text-type__word');
            if (!tokens.length) return;
            const pace = Number((node as HTMLElement).dataset.typingSpeed || 85) / 1000;
            timeline.to(tokens, { opacity: 1, duration: .12, stagger: pace, ease: 'power1.out' }, cursor);
            cursor += tokens.length * pace + .12;
          }
        });
        return;
      }
      if (!enabled) return;
      gsap.to(nodes, { [axis]: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration, ease, delay, stagger, onComplete: () => { gsap.set(nodes, { clearProps: 'transform,filter' }); } });
    }, root);
    return () => ctx.revert();
  }, [enabled, sequentialText, replayKey, distance, direction, reverse, duration, ease, initialOpacity, scale, blur, delay, stagger, targets]);
  return <div ref={root} className={className} style={style} data-narration={replayKey.split(':').at(-1)}>{children}</div>;
}
