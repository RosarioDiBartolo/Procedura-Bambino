import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Application from '../Router';
import { createSession } from '../flow';
import type { VoiceUpdate } from './realtime-client';
const mock = vi.hoisted(() => ({ update: undefined as ((u: VoiceUpdate) => void) | undefined, start: vi.fn(), stop: vi.fn(), action: vi.fn(), context: vi.fn() }));
vi.mock('./realtime-client', () => ({ RealtimeClient: class {
  constructor(_context: unknown, update: (u: VoiceUpdate) => void) { mock.update = update; }
  start() { mock.start(); mock.update?.({ state: 'listening' }); }
  stop() { mock.stop(); mock.update?.({ state: 'off', decision: null }); }
  updateContext(c: unknown) { mock.context(c); mock.update?.({ decision: null }); }
  action(accept: boolean) { mock.update?.({ decision: null }); return mock.action(accept); }
  interrupt() {}
} }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true }) })); });
afterEach(() => { cleanup(); sessionStorage.clear(); window.history.replaceState(null, '', '/'); vi.unstubAllGlobals(); });
async function open() {
  const user = userEvent.setup(); render(<Application />); await user.click(screen.getByRole('button', { name: 'Assistente AI' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Avvia ascolto' }) as HTMLButtonElement).disabled).toBe(false)); return user;
}
describe('Controlli visibili dell’assistente', () => {
  it('richiede un avvio esplicito e termina dal pannello', async () => {
    const user = await open(); expect(mock.start).not.toHaveBeenCalled(); await user.click(screen.getByRole('button', { name: 'Avvia ascolto' }));
    expect(mock.start).toHaveBeenCalledOnce(); await user.click(screen.getByRole('button', { name: 'Chiudi e termina' })); expect(mock.stop).toHaveBeenCalledOnce();
  });
  it('avanza solo dopo conferma visiva e verifiche registrate', async () => {
    sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(), checks: { 'preparation-0': true, 'preparation-1': true, 'preparation-2': true } }));
    const user = await open(); await user.click(screen.getByRole('button', { name: 'Avvia ascolto' }));
    act(() => mock.update?.({ decision: { type: 'PROPOSE_ACTION', action: 'complete_step', targetId: 'preparation', proposalId: 'p', guidelineId: 'preparation:overview', message: 'Proseguire?', priority: 'normal' } }));
    expect(window.location.hash).toContain('/preparation'); mock.action.mockResolvedValue({ applied: true, action: 'complete_step', targetId: 'preparation', next: 'birth' });
    await user.click(screen.getByRole('button', { name: 'Conferma e prosegui' })); expect(window.location.hash).toContain('/birth');
    expect(JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).events.at(-1).text).toContain('confermata sullo schermo');
  });
  it('evidenzia soltanto l’elemento autorizzato dopo conferma', async () => {
    const user = await open(); await user.click(screen.getByRole('button', { name: 'Avvia ascolto' }));
    act(() => mock.update?.({ decision: { type: 'PROPOSE_ACTION', action: 'highlight', targetId: 'preparation-1', proposalId: 'p', guidelineId: 'preparation:action:1', message: 'Briefing del team', priority: 'normal' } }));
    expect(document.querySelector('.assistant-highlight')).toBeNull(); mock.action.mockResolvedValue({ applied: true, action: 'highlight', targetId: 'preparation-1' });
    await user.click(screen.getByRole('button', { name: 'Evidenzia' })); expect(document.querySelector('.assistant-highlight')?.getAttribute('data-assistant-target')).toBe('preparation-1');
  });
});
