import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConversationController } from './conversation-controller';
import { createSession } from '../flow';
import { contextOf, type Decision } from './protocol';
const ignore: Decision = { type: 'IGNORE' };
afterEach(() => vi.useRealTimers());
function setup(evaluate = vi.fn().mockResolvedValue(ignore)) {
  vi.useFakeTimers(); const deliver = vi.fn(), status = vi.fn(), error = vi.fn();
  const c = new ConversationController(contextOf(createSession()), evaluate, deliver, status, error);
  return { c, evaluate, deliver, error };
}
const wait = () => vi.advanceTimersByTimeAsync(400);
describe('Conversazione e concorrenza', () => {
  it('non valuta silenzi o turni incompleti', async () => {
    const { c, evaluate } = setup(); c.inputStopped(); c.commit('a', null); await wait(); expect(evaluate).not.toHaveBeenCalled(); c.stop();
  });
  it('riordina trascrizioni completate fuori ordine', async () => {
    const { c, evaluate } = setup(); c.commit('a', null); c.commit('b', 'a'); c.transcript('b', 'Anzi no'); await wait(); expect(evaluate).not.toHaveBeenCalled();
    c.transcript('a', 'Andiamo avanti'); await wait(); expect(evaluate.mock.calls[0][1]).toEqual([{ id: 'a', text: 'Andiamo avanti' }, { id: 'b', text: 'Anzi no' }]); c.stop();
  });
  it('gestisce una trascrizione prima del commit', async () => {
    const { c, evaluate } = setup(); c.transcript('a', 'Cosa devo preparare?'); c.commit('a', null); await wait(); expect(evaluate).toHaveBeenCalledOnce(); c.stop();
  });
  it('aspetta la pausa anche se la trascrizione è già arrivata', async () => {
    const { c, evaluate } = setup(); c.inputStarted(); c.commit('a', null); c.transcript('a', 'Aspetta'); await wait(); expect(evaluate).not.toHaveBeenCalled(); c.inputStopped(); await wait(); expect(evaluate).toHaveBeenCalledOnce(); c.stop();
  });
  it('scarta una risposta arrivata dopo un ripensamento', async () => {
    let resolve!: (d: Decision) => void;
    const { c, deliver } = setup(vi.fn(() => new Promise<Decision>(r => { resolve = r; })));
    c.commit('a', null); c.transcript('a', 'Avanti'); await wait(); c.inputStarted(); resolve(ignore); await wait(); expect(deliver).not.toHaveBeenCalled(); c.stop();
  });
  it('non sovrappone interventi alla voce in riproduzione', async () => {
    const { c, evaluate } = setup(); c.outputStarted(); c.commit('a', null); c.transcript('a', 'Cosa manca?'); await wait(); expect(evaluate).not.toHaveBeenCalled(); c.outputStopped(); await wait(); expect(evaluate).toHaveBeenCalledOnce(); c.stop();
  });
  it('annulla valutazioni e proposte cambiando passaggio', async () => {
    let resolve!: (d: Decision) => void;
    const { c, deliver } = setup(vi.fn(() => new Promise<Decision>(r => { resolve = r; })));
    c.commit('a', null); c.transcript('a', 'Avanti'); await wait(); c.updateContext({ ...contextOf(createSession()), step: 'birth', revision: 1 }); resolve(ignore); await wait(); expect(deliver).not.toHaveBeenCalled(); c.stop();
  });
  it('non ripete una decisione su eventi duplicati', async () => {
    const { c, evaluate } = setup(); c.commit('a', null); c.transcript('a', 'Cosa faccio?'); await wait(); c.commit('a', null); c.transcript('a', 'Cosa faccio?'); await wait(); expect(evaluate).toHaveBeenCalledOnce(); c.stop();
  });
  it('non usa il turno precedente quando la trascrizione più recente fallisce', async () => {
    const { c, evaluate } = setup(); c.commit('a', null); c.transcript('a', 'Avanti'); c.commit('b', 'a'); c.transcriptionFailed('b'); await wait(); expect(evaluate).not.toHaveBeenCalled(); c.stop();
  });
  it('spegne timer e richieste alla chiusura', async () => {
    const { c, evaluate } = setup(); c.commit('a', null); c.transcript('a', 'Avanti'); c.stop(); await wait(); expect(evaluate).not.toHaveBeenCalled();
  });
});
