import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAnimationFrame, useReducedMotion } from 'motion/react';

/** One persistent, square canvas above every stacking context; only its transform moves. */
export function OrbFlight({ source, destination, open, children }:
  { source: HTMLElement; destination: HTMLElement | null; open: boolean; children: ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const target = useRef('');
  const placed = useRef(false);
  const reduced = useReducedMotion();
  const followSource = useRef<() => void>(() => {});
  useAnimationFrame(() => followSource.current());

  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    function place(animate = true) {
      const anchor = open && destination ? destination : source;
      if (!anchor.isConnected) return;
      const bounds = anchor.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const size = Math.min(bounds.width, bounds.height);
      const x = bounds.left + (bounds.width - size) / 2;
      const y = bounds.top + (bounds.height - size) / 2;
      const baseSize = node!.offsetWidth || 160;
      const next = `translate3d(${x}px, ${y}px, 0) scale(${size / baseSize})`;
      if (target.current === next) {
        if (reduced && animation.current) {
          animation.current.cancel();
          animation.current = null;
          node!.style.transform = next;
          node!.dataset.flightState = 'settled';
        }
        return;
      }
      target.current = next;
      // Read before cancelling, so a reversal continues from the visible position.
      const from = getComputedStyle(node!).transform;
      animation.current?.cancel();
      animation.current = null;
      node!.style.visibility = 'visible';
      node!.style.transform = next;
      if (placed.current && animate && !reduced && typeof node!.animate === 'function') {
        const flight = node!.animate([{ transform: from }, { transform: next }], {
          duration: 450, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'both',
        });
        animation.current = flight;
        node!.dataset.flightState = 'moving';
        void flight.finished.then(() => {
          if (animation.current !== flight) return;
          node!.style.transform = next;
          animation.current = null;
          flight.cancel();
          node!.dataset.flightState = 'settled';
        }).catch(() => {});
      } else node!.dataset.flightState = 'settled';
      placed.current = true;
    }
    place();
    // A sliding sheet changes the anchor's position without resizing it.
    // Follow that movement directly; the sidebar-to-dialog flight remains independent.
    followSource.current = open ? () => {} : () => place(false);
    const resize = () => place();
    const scroll = () => place(false);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(source);
    if (destination) observer?.observe(destination);
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', scroll, true);
    return () => {
      followSource.current = () => {};
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [source, destination, open, reduced]);

  useLayoutEffect(() => () => { animation.current?.cancel(); }, []);

  return createPortal(<div ref={element} aria-hidden="true" data-orb-flight
    data-orb-destination={open && destination ? 'dialog' : 'sidebar'}
    className="pointer-events-none invisible fixed top-0 left-0 z-[2147483000] size-40 origin-top-left [will-change:transform]">
    {children}
  </div>, document.body);
}
