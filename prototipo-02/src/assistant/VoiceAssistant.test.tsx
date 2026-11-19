import type { Context } from './protocol';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import Application from '../Router';

import { createSession } from '../flow';

import type { VoiceUpdate } from './realtime-client';

const mock = vi.hoisted(() => ({ current: undefined as Context | undefined, update: undefined as ((u: VoiceUpdate) => void) | undefined, start: vi.fn(), microphone: vi.fn(), repeat: vi.fn(), text: vi.fn(), interrupt: vi.fn(), stop: vi.fn(), action: vi.fn(), context: vi.fn() }));

vi.mock('./realtime-client', () => ({ RealtimeClient: class {

  constructor(_context: Context, update: (u: VoiceUpdate) => void) { mock.current = _context; mock.update = update; }

  start(listen: boolean) { mock.start(listen); mock.update?.({ state: 'listening', microphone: listen }); }

  sendText(text: string) { mock.text(text); }

  enableMicrophone() { mock.microphone(); mock.update?.({ microphone: true }); }

  disableMicrophone() { mock.update?.({ microphone: false }); }

  enterStep() { mock.repeat(); }

  stop() { mock.stop(); mock.update?.({ state: 'off', decision: null }); }

  updateContext(c: Context) { mock.current = c; mock.context(c); mock.update?.({ decision: null }); }

  action(accept: boolean) { mock.update?.({ decision: null }); return mock.action(accept); }

  interrupt() { mock.interrupt(); mock.update?.({ state: 'listening', interrupted: true }); }

} }));

beforeEach(() => { window.history.replaceState(null, '', '/#/procedura'); vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: true }) })); });

afterEach(() => { cleanup(); sessionStorage.clear(); window.history.replaceState(null, '', '/'); vi.unstubAllGlobals(); });

async function open() {

  const user = userEvent.setup(); render(<Application />); await user.click(screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' }));

  await waitFor(() => expect(mock.start).toHaveBeenCalled()); return user;

}

describe('Controlli visibili dell’assistente', () => {

  it('avvia il microfono e chiude i comandi senza interrompere la sessione', async () => {

    const user = await open(); expect(mock.start).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('button', { name: 'Chiudi impostazioni assistente' }));
    await user.click(screen.getByRole('button', { name: 'Attiva microfono' }));

    expect(screen.getByRole('button', { name: 'Disattiva microfono' })).toBeTruthy(); expect(mock.start).toHaveBeenCalledOnce(); expect(mock.stop).not.toHaveBeenCalled();

  });

  it('avanza solo dopo conferma visiva e verifiche registrate', async () => {

    sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(), checks: { 'preparation-0': true, 'preparation-1': true, 'preparation-2': true } }));

    const user = await open();

    act(() => mock.update?.({ decision: { type: 'PROPOSE_ACTION', action: 'complete_step', targetId: 'preparation', proposalId: 'p', guidelineId: 'preparation:overview', message: 'Proseguire?', priority: 'normal' } }));

    expect(window.location.hash).toContain('/preparation'); mock.action.mockResolvedValue({ applied: true, action: 'complete_step', targetId: 'preparation', next: 'birth' });

    await user.click(screen.getByRole('button', { name: 'Conferma e prosegui' })); expect(window.location.hash).toContain('/birth');

    expect(JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).events.at(-1).text).toContain('confermata sullo schermo');

  });

  it('evidenzia soltanto l’elemento autorizzato dopo conferma', async () => {

    const user = await open();

    act(() => mock.update?.({ decision: { type: 'PROPOSE_ACTION', action: 'highlight', targetId: 'preparation-1', proposalId: 'p', guidelineId: 'preparation:action:1', message: 'Briefing del team', priority: 'normal' } }));

    expect(document.querySelector('.assistant-highlight')).toBeNull(); mock.action.mockResolvedValue({ applied: true, action: 'highlight', targetId: 'preparation-1' });

    await user.click(screen.getByRole('button', { name: 'Evidenzia' })); expect(document.querySelector('.assistant-highlight')?.getAttribute('data-assistant-target')).toBe('preparation-1');

  });

  it('applica subito un’azione autorizzata da Realtime e sincronizza una sola nuova visita', async () => {

    await open(); const c = mock.current!; mock.context.mockClear();

    act(() => mock.update?.({ guided: { message: '', sources: [], observations: {}, missing: [], action: { sessionKey: c.sessionKey, visit: c.visit!, turn: 'native-step', intent: 'complete', next: 'birth' } } }));

    await waitFor(() => expect(window.location.hash).toContain('/birth'));

    expect(mock.context).toHaveBeenCalledOnce(); expect(mock.current?.step).toBe('birth');

    expect(screen.queryByRole('button', { name: 'Conferma e prosegui' })).toBeNull();

    expect(JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).events.filter((e: any) => e.type === 'transition')).toHaveLength(1);

  });



});





describe('Esperienza con orbita', () => {

  it('mostra il saluto in home e apre la preparazione su richiesta', async () => {

    window.history.replaceState(null, '', '/');

    const user = userEvent.setup(); render(<Application />);

    expect(screen.getByText(/Ciao, sono il tuo assistente Nido/)).toBeTruthy();

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Inizia dalla preparazione' }));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Preparazione');

  });

  it('porta il focus all’utente durante la voce e lo ripristina alla fine', async () => {

    await open();

    act(() => mock.update?.({ userSpeaking: true }));

    expect(document.querySelector('.assistant-focused')).toBeTruthy();

    expect(screen.getAllByText('Ti ascolto').length).toBeGreaterThan(0);

    act(() => mock.update?.({ userSpeaking: false }));

    expect(document.querySelector('.assistant-focused')).toBeNull();

  });

});


it('mostra trascrizioni e risposte nella conversazione principale senza aprire i controlli', async () => {
  render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  act(() => mock.update?.({ transcript: 'Siamo pronti', assistantTranscript: 'Passiamo alla nascita.' }));
  const log = screen.getByRole('log', { name: 'Conversazione con Nido' });
  expect(log.textContent).toContain('Siamo pronti');
  expect(log.textContent).toContain('Passiamo alla nascita.');
  expect(log.closest('main')).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assistente Nido' })).toBeNull());
});

it('mostra in home l’ultima coppia e conserva tutti i messaggi negli step della stessa sessione', async () => {
  window.history.replaceState(null, '', '/');
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  act(() => mock.update?.({ assistantTranscript: 'Benvenuto nella simulazione.' }));
  act(() => mock.update?.({ transcript: 'Come iniziamo?' }));
  act(() => mock.update?.({ assistantTranscript: '' }));
  act(() => mock.update?.({ assistantTranscript: 'Iniziamo dalla preparazione.' }));
  const preview = screen.getByRole('log', { name: 'Conversazione con Nido' });
  expect(preview.textContent).toContain('Come iniziamo?');
  expect(preview.textContent).toContain('Iniziamo dalla preparazione.');
  expect(preview.textContent).not.toContain('Benvenuto nella simulazione.');
  expect(preview.querySelectorAll('article')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Inizia dalla preparazione' }));
  const conversation = screen.getByRole('log', { name: 'Conversazione con Nido' });
  expect(conversation.textContent).toContain('Benvenuto nella simulazione.');
  expect(conversation.textContent).toContain('Come iniziamo?');
  expect(conversation.textContent).toContain('Iniziamo dalla preparazione.');
  expect(conversation.querySelectorAll('article')).toHaveLength(3);
});

it('dalla home apre subito la valutazione sullo scenario riferito e conserva la frase in chat', async () => {
  window.history.replaceState(null, '', '/'); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  const c = mock.current!;
  act(() => mock.update?.({ transcript: 'La temperatura del bambino è molto alta', guided: { message: 'Qual è il valore misurato?', sources: [], observations: {}, missing: ['term', 'tone', 'breathing'], action: { sessionKey: c.sessionKey, visit: c.visit!, turn: 'orient-temperature', intent: 'orient', orientation: { scenario: 'temperature', observations: {} }, next: 'initial' } } }));
  await waitFor(() => expect(window.location.hash).toContain('/procedura/initial'));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Valutazione iniziale');
  expect(screen.getByRole('log', { name: 'Conversazione con Nido' }).textContent).toContain('La temperatura del bambino è molto alta');
  expect(mock.repeat).not.toHaveBeenCalled();
  expect(JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).birthAt).toBeNull();
});

it('unisce i frammenti vocali consecutivi in un unico messaggio utente', async () => {
  window.history.replaceState(null, '', '/'); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  act(() => mock.update?.({ transcript: 'Ho completato' }));
  act(() => mock.update?.({ transcript: 'tutta la preparazione' }));
  const log = screen.getByRole('log', { name: 'Conversazione con Nido' });
  expect(log.querySelectorAll('.from-user')).toHaveLength(1);
  expect(log.textContent).toContain('Ho completato tutta la preparazione');
  act(() => mock.update?.({ assistantTranscript: 'Passiamo alla nascita.' }));
  act(() => mock.update?.({ transcript: 'Il bambino è nato' }));
  expect(log.textContent).toContain('Il bambino è nato');
});
it('riduce i controlli senza terminare la voce e riapre dall’orbita', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  await user.click(screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' }));
  expect(screen.getByRole('dialog', { name: 'Assistente Nido' })).toBeTruthy();
  await user.click(screen.getAllByRole('button', { name: 'Chiudi impostazioni assistente' }).at(-1)!);
  expect(mock.stop).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assistente Nido' })).toBeNull());
  expect(screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' }).getAttribute('aria-expanded')).toBe('false');
});
it('nasconde ed espande la sidebar senza perdere la conversazione o riavviare lo step', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  act(() => mock.update?.({ transcript: 'Siamo pronti' }));
  const step = document.querySelector('.step-presentation');
  await user.click(screen.getByRole('button', { name: 'Nascondi conversazione' }));
  expect(screen.queryByRole('log')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Mostra conversazione' }));
  expect(screen.getByRole('log').textContent).toContain('Siamo pronti');
  expect(document.querySelector('.minimal-sidebar.is-open')).toBeTruthy();
  expect(document.querySelector('.step-presentation')).toBe(step);
  const visit = mock.current!.visit!;
  act(() => mock.update?.({ narrationVisit: visit }));
  expect(step?.classList.contains('is-revealing')).toBe(true);
  act(() => mock.update?.({ assistantTranscript: 'Un’altra risposta' }));
  expect(document.querySelector('.step-presentation')).toBe(step);
});

it('ripete l’animazione a ogni spiegazione dello stesso step senza rimontarne i controlli', async () => {
  const user = await open();
  await user.click(screen.getByRole('button', { name: 'Chiudi impostazioni assistente' }));
  const visit = mock.current!.visit!;
  act(() => mock.update?.({ narrationVisit: visit }));
  const step = document.querySelector('.step-presentation')!;
  const heading = screen.getByRole('heading', { level: 1 });
  expect(step.classList.contains('replay-odd')).toBe(true);
  if (screen.queryByRole('dialog', { name: 'Assistente Nido' })) await user.click(screen.getByRole('button', { name: 'Chiudi impostazioni assistente' }));
  await user.click(screen.getByRole('button', { name: 'Rispiega questo step' }));
  expect(mock.repeat).toHaveBeenCalledOnce();
  expect(step.getAttribute('data-narration')).toBe('1');
  expect(document.querySelector('[data-agent-state="analyzing"]')).toBeTruthy();
  act(() => mock.update?.({ narrationVisit: visit, state: 'speaking' }));
  expect(step.classList.contains('replay-even')).toBe(true);
  expect(step.getAttribute('data-narration')).toBe('2');
  expect(document.querySelector('[data-agent-state="speaking"]')).toBeTruthy();
  act(() => mock.update?.({ narrationVisit: visit }));
  expect(step.getAttribute('data-narration')).toBe('2');
  expect(screen.getByRole('heading', { level: 1 })).toBe(heading);
});

it('riduce la sidebar con Ctrl+B mantenendo bozza, microfono e risposta in corso', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  const input = screen.getByRole('textbox', { name: 'Messaggio a Nido' }) as HTMLTextAreaElement;
  await user.type(input, 'Bozza da conservare');
  await user.click(screen.getByRole('button', { name: 'Attiva microfono' }));
  await user.click(screen.getByRole('button', { name: 'Scrivi' }));
  act(() => mock.update?.({ microphone: true, state: 'speaking', assistantTranscript: 'Spiegazione in corso' }));
  await user.keyboard('{Control>}b{/Control}');
  expect(document.querySelector('[data-slot=sidebar]')?.getAttribute('data-state')).toBe('collapsed');
  expect(screen.queryByRole('textbox', { name: 'Messaggio a Nido' })).toBeNull();
  await user.keyboard('{Control>}b{/Control}');
  expect((screen.getByRole('textbox', { name: 'Messaggio a Nido' }) as HTMLTextAreaElement).value).toBe('Bozza da conservare');
  expect(screen.getByRole('log').textContent).toContain('Spiegazione in corso');
  expect(document.querySelector('[data-agent-state="speaking"]')).toBeTruthy();
  expect(mock.start).toHaveBeenCalledOnce();
  expect(mock.stop).not.toHaveBeenCalled();
  expect(mock.interrupt).not.toHaveBeenCalled();
});

it('annulla il replay in attesa quando la risposta viene interrotta', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Rispiega questo step' }));
  await user.click(screen.getByRole('button', { name: 'Interrompi risposta' }));
  act(() => mock.update?.({ narrationVisit: mock.current!.visit }));
  expect(document.querySelector('.step-presentation')?.getAttribute('data-narration')).toBe('1');
});

it('mostra LatticeLoader nella sidebar e nel dialog solo durante l’elaborazione', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  expect(screen.queryByText('Sto pensando')).toBeNull();
  act(() => mock.update?.({ state: 'analyzing' }));
  expect(screen.getAllByText('Sto pensando')).toHaveLength(1);
  expect(screen.getByText('Sto pensando').closest('.session-chat')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' }));
  expect(screen.getAllByText('Sto pensando')).toHaveLength(2);
  expect(screen.getByRole('dialog', { name: 'Assistente Nido' }).textContent).toContain('Sto pensando');
  act(() => mock.update?.({ state: 'speaking' }));
  expect(screen.queryByText('Sto pensando')).toBeNull();
  act(() => mock.update?.({ state: 'analyzing' }));
  expect(screen.getAllByText('Sto pensando')).toHaveLength(2);
  act(() => mock.update?.({ interrupted: true, state: 'listening' }));
  expect(screen.queryByText('Sto pensando')).toBeNull();
  act(() => mock.update?.({ state: 'analyzing', interrupted: false, error: 'Errore di collegamento' }));
  expect(screen.queryByText('Sto pensando')).toBeNull();
});

it('sincronizza anche il replay richiesto parlando con l’inizio della narrazione', async () => {
  render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  const visit = mock.current!.visit!;
  act(() => mock.update?.({ replayVisit: visit, state: 'analyzing' }));
  expect(document.querySelector('.step-presentation')?.getAttribute('data-narration')).toBe('1');
  act(() => mock.update?.({ narrationVisit: visit, state: 'speaking' }));
  expect(document.querySelector('.step-presentation')?.getAttribute('data-narration')).toBe('2');
});

it('rispiega dopo la disattivazione riattivando l’assistente e poi le animazioni', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Disattiva assistente vocale per la sessione' }));
  expect(document.querySelector('[data-agent-state="off"]')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Rispiega questo step' }));
  expect(mock.start).toHaveBeenCalledTimes(2);
  expect(mock.start).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole('button', { name: 'Disattiva assistente vocale per la sessione' })).toBeTruthy();
  expect(document.querySelector('.step-presentation')?.getAttribute('data-narration')).toBe('1');
  act(() => mock.update?.({ state: 'analyzing' }));
  expect(document.querySelector('[data-agent-state="analyzing"]')).toBeTruthy();
  act(() => mock.update?.({ narrationVisit: mock.current!.visit, state: 'speaking' }));
  expect(document.querySelector('.step-presentation')?.getAttribute('data-narration')).toBe('2');
  expect(document.querySelector('[data-agent-state="speaking"]')).toBeTruthy();
  act(() => mock.update?.({ state: 'listening' }));
  expect(document.querySelector('[data-agent-state="listening"]')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Attiva microfono' }).textContent).toContain('Microfono');
});
it('ricaricando lo step riparte la guida anche con la sessione già salvata', async () => {
  const view = render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledTimes(1));
  const visit = mock.current!.visit!;
  act(() => mock.update?.({ narrationVisit: visit }));
  view.unmount();
  render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledTimes(2));
  expect(mock.start).toHaveBeenLastCalledWith(false);
  expect(mock.current!.visit).toBe(visit);
  act(() => mock.update?.({ narrationVisit: visit }));
  expect(document.querySelector('.step-presentation')?.getAttribute('data-narration')).toBe('1');
});

it('ospita Nido nella sidebar e chiude il dialogo dopo la selezione di un comando', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  const orbit = screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' });
  expect(orbit.closest('.session-chat')).toBeTruthy();
  expect(screen.getByText('Nido', { selector: '.assistant-name' })).toBeTruthy();
  await user.click(orbit);
  await user.click(screen.getByRole('button', { name: 'Chiudi impostazioni assistente' }));
  await user.click(screen.getByRole('button', { name: 'Rispiega questo step' }));
  expect(mock.repeat).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assistente Nido' })).toBeNull());
  expect(screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' }).closest('.session-chat')).toBeTruthy();
  expect(mock.stop).not.toHaveBeenCalled();
});

it('trasferisce la stessa orb nel dialogo e ritorno senza ricreare il visualizzatore', async () => {
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  const orb = document.querySelector('[data-slot=voice-orb]');
  expect(orb).toBeTruthy();
  expect(document.querySelectorAll('[data-slot=voice-orb]')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Comandi e impostazioni di Nido' }));
  expect(screen.getByRole('dialog', { name: 'Assistente Nido' })).toBeTruthy();
  expect(document.querySelector('[data-orb-flight]')?.getAttribute('data-orb-destination')).toBe('dialog');
  expect(document.querySelector('[data-slot=voice-orb]')).toBe(orb);
  await user.click(screen.getByRole('button', { name: 'Chiudi impostazioni assistente' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assistente Nido' })).toBeNull());
  expect(document.querySelector('[data-orb-flight]')?.getAttribute('data-orb-destination')).toBe('sidebar');
  expect(document.querySelector('[data-slot=voice-orb]')).toBe(orb);
  expect(document.querySelectorAll('[data-slot=voice-orb]')).toHaveLength(1);
  expect(mock.start).toHaveBeenCalledOnce();
});

it('in home mostra i controlli sotto il messaggio senza pulsante assistente o dialogo', async () => {
  window.history.replaceState(null, '', '/'); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: /^Assistente AI/ })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Comandi e impostazioni di Nido' })).toBeNull();
  const controls = screen.getByLabelText('Controlli vocali');
  expect(controls.closest('.assistant-stage')).toBeTruthy();
  expect(controls.closest('footer')).toBeNull();
  act(() => mock.update?.({ state: 'speaking' }));
  expect(document.querySelector('[data-orbit-state=speaking]')).toBeTruthy();
  act(() => mock.update?.({ userSpeaking: true }));
  expect(document.querySelector('[data-orbit-state=resting]')).toBeTruthy();
  act(() => mock.update?.({ userSpeaking: false, state: 'analyzing' }));
  expect(document.querySelector('[data-orbit-state=resting]')).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assistente Nido' })).toBeNull());
});


describe('Disattivazione vocale della sessione', () => {
  it('interrompe il collegamento e conserva la scelta dopo una ricarica', async () => {
    const user = userEvent.setup(); const view = render(<Application />);
    await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
    const oldUpdate = mock.update;
    await user.click(screen.getByRole('button', { name: 'Disattiva assistente vocale per la sessione' }));
    expect(mock.interrupt).toHaveBeenCalledOnce();
    expect(mock.stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Attiva microfono' })).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).voiceDisabled).toBe(true);
    act(() => oldUpdate?.({ assistantTranscript: 'Risposta da ignorare', microphone: true }));
    expect(screen.queryByText('Risposta da ignorare')).toBeNull();
    view.unmount(); mock.start.mockClear(); vi.mocked(fetch).mockClear();
    render(<Application />);
    expect(mock.start).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Riattiva assistente vocale' })).toBeTruthy();
  });

  it.each([['Rispiega questo step', false], ['Attiva microfono', true], ['Riattiva assistente vocale', true]] as const)('riattiva solo su comando manuale: %s', async (name, listen) => {
    sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(), voiceDisabled: true }));
    const user = userEvent.setup(); render(<Application />);
    expect(mock.start).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name }));
    await waitFor(() => expect(mock.start).toHaveBeenCalledExactlyOnceWith(listen));
    expect(JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).voiceDisabled).toBe(false);
  });
});

it('rende il cambio di step visibile in chat e nel registro esportabile', async () => {
  await open(); const c = mock.current!;
  act(() => mock.update?.({ assistantTranscript: 'Spiegazione precedente', state: 'speaking' }));
  act(() => mock.update?.({ guided: { message: '', sources: [], observations: {}, missing: [], action: { sessionKey: c.sessionKey, visit: c.visit!, turn: 'report-transition', intent: 'complete', next: 'birth' } } }));
  await waitFor(() => expect(window.location.hash).toContain('/birth'));
  expect(screen.getByText('Cambio di step')).toBeTruthy();
  const event = JSON.parse(sessionStorage.getItem('nls-simulation-v1')!).events.find((item: any) => item.to === 'birth');
  expect(event).toMatchObject({ from: 'preparation', to: 'birth', type: 'transition' });
  act(() => mock.update?.({ assistantTranscript: '', state: 'speaking' }));
  act(() => mock.update?.({ assistantTranscript: 'Descrizione corrente della nascita' }));
  expect(screen.getByText('Cambio di step')).toBeTruthy();
  expect(screen.getByText('Descrizione corrente della nascita')).toBeTruthy();
});

it('dalla home apre lo step anche se la sessione era già su quel passaggio', async () => {
  window.history.replaceState(null, '', '/');
  sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(1), step: 'cord', birthAt: 2 }));
  render(<Application />); await waitFor(() => expect(mock.start).toHaveBeenCalled());
  const c = mock.current!;
  act(() => mock.update?.({ guided: { message: '', sources: [], observations: {}, missing: [], action: { sessionKey: c.sessionKey, visit: c.visit!, turn: 'same-step-home', intent: 'orient', orientation: { scenario: 'cord', observations: {} }, next: 'cord' } } }));
  await waitFor(() => expect(window.location.hash).toContain('/procedura/cord'));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Gestione del cordone');
});

it('mantiene lo stesso assistente passando dalla home allo step', async () => {
  window.history.replaceState(null, '', '/');
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  await user.click(screen.getByRole('button', { name: 'Inizia dalla preparazione' }));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Preparazione'));
  expect(mock.start).toHaveBeenCalledOnce(); expect(mock.stop).not.toHaveBeenCalled();
  expect(mock.repeat).toHaveBeenCalledOnce();
});
it('non riavvia l’animazione quando arrivano notifiche audio tardive', async () => {
  vi.useFakeTimers();
  try {
    render(<Application />);
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    const presentation = document.querySelector('.step-presentation')!;
    expect(presentation.classList.contains('is-revealing')).toBe(true);
    const run = presentation.getAttribute('data-narration');
    act(() => mock.update?.({ narrationVisit: mock.current!.visit }));
    expect(presentation.getAttribute('data-narration')).toBe(run);
    act(() => mock.update?.({ narrationVisit: mock.current!.visit }));
    expect(presentation.getAttribute('data-narration')).toBe('1');
  } finally { vi.useRealTimers(); }
});

it.each(['/', '/#/procedura'])('invia messaggi scritti dalla conversazione: %s', async path => {
  window.history.replaceState(null, '', path);
  const user = userEvent.setup(); render(<Application />);
  await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
  const input = screen.getByRole('textbox', { name: 'Messaggio a Nido' });
  await user.type(input, 'Aggiornamento scritto{Enter}');
  expect(mock.text).toHaveBeenCalledWith('Aggiornamento scritto');
  expect(screen.getByRole('log').textContent).toContain('Aggiornamento scritto');
  expect((input as HTMLTextAreaElement).value).toBe('');
});
it('invia anche a servizio disattivato senza avviare il microfono', async () => {
  sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(), voiceDisabled: true }));
  const user = userEvent.setup(); render(<Application />);
  await user.type(screen.getByRole('textbox', { name: 'Messaggio a Nido' }), 'Messaggio senza audio');
  await user.click(screen.getByRole('button', { name: 'Invia messaggio' }));
  expect(mock.start).toHaveBeenCalledExactlyOnceWith(false);
  expect(mock.text).toHaveBeenCalledWith('Messaggio senza audio');
});

it('anima subito lo step a voce disattivata e ignora gli avvii automatici dell’audio', async () => {
  sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(), voiceDisabled: true }));
  render(<Application />);
  const presentation = document.querySelector('.step-presentation')!;
  expect(presentation.classList.contains('is-revealing')).toBe(true);
  expect(presentation.getAttribute('data-narration')).toBe('1');
  expect(mock.start).not.toHaveBeenCalled();
});

describe('Input dell’agente nella conversazione', () => {
  it('alterna testo e ascolto continuo sullo stesso collegamento', async () => {
    const user = userEvent.setup(); render(<Application />);
    await waitFor(() => expect(mock.start).toHaveBeenCalledExactlyOnceWith(false));
    expect(screen.getByRole('textbox', { name: 'Messaggio a Nido' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Attiva microfono' }));
    expect(mock.microphone).toHaveBeenCalledOnce();
    expect(screen.queryByRole('textbox', { name: 'Messaggio a Nido' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Disattiva microfono' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Scrivi' }));
    expect(screen.getByRole('textbox', { name: 'Messaggio a Nido' })).toBeTruthy();
    expect(mock.start).toHaveBeenCalledOnce();
  });

  it.each(['analyzing', 'speaking'] as const)('sostituisce invio con Stop durante %s senza perdere la bozza', async state => {
    const user = userEvent.setup(); render(<Application />);
    await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
    const input = screen.getByRole('textbox', { name: 'Messaggio a Nido' });
    await user.type(input, 'La mia prossima domanda');
    act(() => mock.update?.({ state }));
    expect(screen.queryByRole('button', { name: 'Invia messaggio' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Interrompi risposta' }));
    expect(mock.interrupt).toHaveBeenCalledOnce();
    expect((input as HTMLTextAreaElement).value).toBe('La mia prossima domanda');
    expect(screen.getByRole('button', { name: 'Invia messaggio' })).toBeTruthy();
    expect(document.querySelector('[data-agent-state=listening]')).toBeTruthy();
  });

  it('ferma anche una connessione ancora in apertura', async () => {
    const user = userEvent.setup(); render(<Application />);
    await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
    act(() => mock.update?.({ state: 'connecting' }));
    const calls = mock.stop.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Interrompi risposta' }));
    expect(mock.stop.mock.calls.length).toBe(calls + 1);
    expect(screen.getByRole('button', { name: 'Invia messaggio' })).toBeTruthy();
  });

  it.each(['connecting', 'listening', 'analyzing', 'speaking', 'off'] as const)('riflette lo stato %s nell’orb', async state => {
    render(<Application />); await waitFor(() => expect(mock.start).toHaveBeenCalledOnce());
    act(() => mock.update?.({ state, error: '' }));
    expect(document.querySelector(`[data-agent-state=${state}]`)).toBeTruthy();
  });
});

