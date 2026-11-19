import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import AnimatedContent from './AnimatedContent';
import TextType from './TextType';
import { AppearanceContext } from './AppearanceContext';
const animation = vi.hoisted(() => ({ to: vi.fn(), set: vi.fn() }));
vi.mock('gsap', () => ({ gsap: { set: animation.set, context: (callback: () => void) => { callback(); return { revert: vi.fn() }; }, timeline: () => ({ to: animation.to }) } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('scrive parole intere e avvia il secondo testo solo dopo il primo', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  render(<AppearanceContext.Provider value={{ enabled: true, replayKey: 'one', sequential: true }}><AnimatedContent sequentialText targets="section"><section><TextType text="Prima frase completa" /><TextType text="Seconda frase" /></section></AnimatedContent></AppearanceContext.Provider>);
  const words = document.querySelectorAll('.text-type__word');
  expect(Array.from(words, word => word.getAttribute('data-char'))).toEqual(['Prima ', 'frase ', 'completa', 'Seconda ', 'frase']);
  const textCalls = animation.to.mock.calls.filter(call => call[0] instanceof NodeList);
  expect(textCalls).toHaveLength(2);
  expect(textCalls[0][2]).toBe(0);
  expect(textCalls[1][2]).toBeGreaterThanOrEqual(3 * .085);
});
