import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import Application from '../../Router';
import { sendPlayground } from './simulated-client';
import { playgroundStorageKey } from './mode';

beforeEach(() => { vi.useFakeTimers(); window.history.replaceState(null, '', '/?playground=1#/procedura'); vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network must not be used'); })); });
afterEach(() => { cleanup(); sessionStorage.clear(); window.history.replaceState(null, '', '/'); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function start() { render(<Application />); await act(async () => { await Promise.resolve(); }); }

describe('Playground senza API', () => {
  it('avvia il simulatore senza rete e senza modificare la sessione reale', async () => {
    sessionStorage.setItem('nls-simulation-v1', 'sessione reale da preservare');
    await start();
    expect(screen.getByRole('complementary', { name: 'Playground locale' })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('nls-simulation-v1')).toBe('sessione reale da preservare');
    expect(JSON.parse(sessionStorage.getItem(playgroundStorageKey)!).step).toBe('preparation');
    expect(screen.getByRole('button', { name: 'Attiva microfono' })).toBeTruthy();
  });
  it('applica il completamento alle stesse regole e cambia lo step', async () => {
    await start();
    act(() => sendPlayground({ type: 'utterance', text: 'Ho completato tutta la preparazione', scenario: 'complete' }));
    await act(async () => { vi.advanceTimersByTime(800); });
    expect(window.location.hash).toContain('/birth');
    expect(JSON.parse(sessionStorage.getItem(playgroundStorageKey)!).birthAt).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('gestisce frammenti, risposta progressiva, interruzione ed errore locale', async () => {
    await start();
    act(() => sendPlayground({ type: 'utterance', text: 'Il bambino', scenario: 'none' }));
    await act(async () => { vi.advanceTimersByTime(300); });
    act(() => sendPlayground({ type: 'utterance', text: 'ha una temperatura alta', scenario: 'none' }));
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('log').textContent).toContain('Il bambino ha una temperatura alta');
    expect(screen.getByRole('log').querySelectorAll('.from-user')).toHaveLength(1);
    act(() => sendPlayground({ type: 'response', text: 'Risposta di prova abbastanza lunga' }));
    await act(async () => { vi.advanceTimersByTime(180); });
    const before = screen.getByRole('log').textContent;
    act(() => sendPlayground({ type: 'interrupt' }));
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByRole('log').textContent?.replace(' - interrotto', '')).toBe(before);
    act(() => sendPlayground({ type: 'error' }));
    expect(screen.getByRole('alert').textContent).toContain('Errore 429 simulato: nessuna richiesta');
    expect(fetch).not.toHaveBeenCalled();
  });
});
