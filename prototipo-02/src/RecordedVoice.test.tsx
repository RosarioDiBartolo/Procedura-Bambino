import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecordedVoice } from './RecordedVoice';
let clips: any[];
beforeEach(() => {
  const storage = new Map<string,string>();
  vi.stubGlobal('localStorage', {getItem: (key:string) => storage.get(key) ?? null, setItem: (key:string,value:string) => storage.set(key,value)}); clips = [];
  vi.stubGlobal('Audio', class {
    src: string; preload = ''; currentTime = 0; onended: any; onerror: any;
    play = vi.fn(() => Promise.resolve()); pause = vi.fn(); load = vi.fn(); removeAttribute = vi.fn();
    constructor(src: string) { this.src = src; clips.push(this); }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('attiva, ripete da zero, interrompe e disattiva la registrazione', async () => {
  render(<RecordedVoice clip="preparation" visit="1" />);
  expect(clips[0].play).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Attiva voce'}));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Lettura in corso'));
  clips[0].currentTime = 12;
  fireEvent.click(screen.getByRole('button', {name:'Ripeti'}));
  expect(clips[0].currentTime).toBe(0); expect(clips[0].play).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', {name:'Interrompi'}));
  expect(screen.getByRole('status').textContent).toBe('Lettura interrotta');
  fireEvent.click(screen.getByRole('button', {name:'Disattiva voce'}));
  expect(window.localStorage.getItem('nido-recorded-voice-enabled')).toBe('false');
});
it('ferma il vecchio audio al cambio visita e non riparte dopo la disattivazione', async () => {
  const view = render(<RecordedVoice clip="preparation" visit="1" />);
  fireEvent.click(screen.getByRole('button', {name:'Attiva voce'}));
  view.rerender(<RecordedVoice clip="birth" visit="2" />);
  expect(clips[0].pause).toHaveBeenCalled(); expect(clips[1].src).toContain('/audio/qwen/birth.wav');
  expect(clips[1].play).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', {name:'Disattiva voce'}));
  view.rerender(<RecordedVoice clip="cord" visit="3" />);
  expect(clips[2].play).not.toHaveBeenCalled();
});
it('gestisce il blocco della riproduzione senza impedire la procedura', async () => {
  render(<RecordedVoice clip="birth" visit="1" />);
  clips[0].play.mockRejectedValueOnce(new Error('NotAllowedError'));
  fireEvent.click(screen.getByRole('button', {name:'Attiva voce'}));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Premi Ascolta'));
  expect((screen.getByRole('button', {name:'Ascolta / Ripeti'}) as HTMLButtonElement).disabled).toBe(false);
});
