import { applyAuthorized } from './assessment';
import { realtimeTools } from './realtime-tools';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient } from './realtime-client';
import { contextOf } from './protocol';
import { createSession } from '../flow';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup() {
  vi.useFakeTimers();
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const sender = { replaceTrack: vi.fn().mockResolvedValue(undefined) };
  const media = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: media } });
  const channel = { readyState: 'open', send: vi.fn(), close: vi.fn(), onmessage: null as any, onclose: null as any, onerror: null as any };
  const pc = { addTrack: vi.fn().mockReturnValue(sender), addTransceiver: vi.fn().mockReturnValue({ sender }), createDataChannel: () => channel, createOffer: vi.fn().mockResolvedValue({ sdp: 'offer' }), setLocalDescription: vi.fn(), setRemoteDescription: vi.fn(), close: vi.fn(), ontrack: null, onconnectionstatechange: null };
  vi.stubGlobal('RTCPeerConnection', function () { return pc; });
  const audio = { pause: vi.fn(), play: vi.fn().mockResolvedValue(undefined), srcObject: null };
  vi.stubGlobal('Audio', function () { return audio; });
  const fetcher = vi.fn(async (url: string, options?: RequestInit): Promise<any> => {
    if (url.endsWith('/session')) return { ok: true, json: async () => ({ token: 'local-token', clientSecret: 'temporary', expiresAt: Date.now() + 1800000 }) };
    if (url.endsWith('/calls')) return { ok: true, text: async () => 'answer' };
    if (url.endsWith('/realtime-config')) return { ok: true, json: async () => ({ instructions: 'Procedura completa', tools: realtimeTools, nextQuestion: null }) };
    return { ok: true, json: async () => ({ ok: true }) };
  });
  vi.stubGlobal('fetch', fetcher);
  const session = createSession(); const update = vi.fn(); const client = new RealtimeClient(contextOf(session), update);
  const event = (e: unknown) => channel.onmessage({ data: JSON.stringify(e) });
  const turn = (id = 'a', transcript = 'Cosa preparo?') => {
    event({ type: 'input_audio_buffer.speech_started', item_id: id }); event({ type: 'input_audio_buffer.speech_stopped', item_id: id });
    event({ type: 'input_audio_buffer.committed', item_id: id }); event({ type: 'conversation.item.input_audio_transcription.completed', item_id: id, transcript });
  };
  return { session, client, update, sender, track, media, stream, pc, audio, fetcher, event, turn, channel };
}
describe('Collegamento audio', () => {
  it('mantiene la sessione quando VAD ha già annullato una risposta', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' });
    s.event({ type: 'error', error: { code: 'response_cancel_not_active' } });
    expect(s.pc.close).not.toHaveBeenCalled(); s.client.stop();
  });
  it('rilascia un microfono autorizzato dopo che l’utente ha già annullato', async () => {
    const s = setup(); let resolve!: (stream: unknown) => void; s.media.mockImplementation(() => new Promise(r => { resolve = r; }));
    const starting = s.client.start(); s.client.stop(); resolve(s.stream); await starting;
    expect(s.track.stop).toHaveBeenCalledOnce(); expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('chiude tracce, connessione e riproduzione quando il servizio fallisce', async () => {
    const s = setup(); s.fetcher.mockRejectedValueOnce(new Error('offline')); await s.client.start();
    expect(s.track.stop).toHaveBeenCalledOnce(); expect(s.audio.pause).toHaveBeenCalled(); expect(s.update).toHaveBeenCalledWith(expect.objectContaining({ state: 'off' }));
  });
  it('annulla la voce al barge-in e ignora una risposta tardiva', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); s.turn(); await vi.advanceTimersByTimeAsync(400);
    const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    expect(response.response.input).toBeUndefined(); expect(response.response.conversation).toBeUndefined(); expect(response.response.output_modalities).toEqual(['text']);
    s.event({ type: 'input_audio_buffer.speech_started', item_id: 'b' });
    s.event({ type: 'response.created', response: { id: 'late', metadata: response.response.metadata } });
    expect(s.channel.send.mock.calls.map(([json]) => JSON.parse(json))).toContainEqual({ type: 'response.cancel', response_id: 'late' });
    s.client.stop(); expect(s.pc.close).toHaveBeenCalledOnce(); expect(s.track.stop).toHaveBeenCalledOnce();
  });
  it('scarta la trascrizione di un passo precedente', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); s.event({ type: 'input_audio_buffer.speech_started', item_id: 'old' });
    s.client.updateContext({ ...contextOf(createSession()), step: 'birth', revision: 1 });
    s.event({ type: 'input_audio_buffer.speech_stopped', item_id: 'old' }); s.event({ type: 'input_audio_buffer.committed', item_id: 'old' });
    s.event({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'old', transcript: 'Prosegui' });
    await vi.advanceTimersByTimeAsync(400); expect(s.fetcher.mock.calls.some(([url]) => url.endsWith('/turn'))).toBe(false); s.client.stop();
  });
  it('ferma la risposta audio fuori conversazione appena l’utente parla e riprende solo con la nuova risposta', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
    const first = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    expect(first.response.conversation).toBe('none');
    s.event({ type: 'response.created', response: { id: 'out-of-band-audio', metadata: first.response.metadata } });
    s.event({ type: 'output_audio_buffer.started', response_id: 'out-of-band-audio' });
    expect((s.audio as any).muted).toBe(false);
    s.channel.send.mockClear();
    s.event({ type: 'input_audio_buffer.speech_started', item_id: 'barge-in' });
    expect((s.audio as any).muted).toBe(true);
    expect(s.channel.send.mock.calls.map(([json]) => JSON.parse(json))).toContainEqual({ type: 'response.cancel', response_id: 'out-of-band-audio' });
    expect(s.channel.send.mock.calls.map(([json]) => JSON.parse(json))).toContainEqual({ type: 'output_audio_buffer.clear' });
    s.event({ type: 'output_audio_buffer.started', response_id: 'out-of-band-audio' });
    expect((s.audio as any).muted).toBe(true);
    s.event({ type: 'input_audio_buffer.speech_stopped', item_id: 'barge-in' });
    s.channel.send.mockClear(); await s.client.enterStep();
    const next = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    s.event({ type: 'response.created', response: { id: 'new-audio', metadata: next.response.metadata } });
    s.event({ type: 'output_audio_buffer.started', response_id: 'new-audio' });
    expect((s.audio as any).muted).toBe(false);
    s.client.stop();
  });
  it.each(['done-first', 'playback-first'])('attende generazione e riproduzione (%s)', async order => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
    const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    const data = { id: 'r1', metadata: response.response.metadata, status: 'completed' };
    s.event({ type: 'response.created', response: data }); s.event({ type: 'output_audio_buffer.started', response_id: 'r1' });
    const done = { type: 'response.done', response: data }; const stopped = { type: 'output_audio_buffer.stopped', response_id: 'r1' };
    s.event(order === 'done-first' ? done : stopped); s.update.mockClear(); s.event(order === 'done-first' ? stopped : done);
    expect(s.update).toHaveBeenCalledWith({ state: 'listening' }); s.client.stop();
  });
  it('introduce all’attivazione e al cambio visita, senza ripartire sulle spunte', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
    expect(s.fetcher.mock.calls.filter(([url]) => url.endsWith('/realtime-config'))).toHaveLength(1);
    const c = JSON.parse(String(s.fetcher.mock.calls.find(([url]) => url.endsWith('/session'))![1]?.body)).context;
    // Same visit, only a checklist edit: no new introduction.
    s.client.updateContext({ ...c, revision: 1, checks: ['preparation-0'] }); await vi.advanceTimersByTimeAsync(0);
    const count = s.fetcher.mock.calls.filter(([url]) => url.endsWith('/realtime-config')).length; expect(count).toBe(1);
    s.client.updateContext({ ...c, step: 'birth', visit: 'new-visit', revision: 2, checks: [] }); await vi.advanceTimersByTimeAsync(0);
    expect(s.fetcher.mock.calls.filter(([url]) => url.endsWith('/realtime-config'))).toHaveLength(count + 1);
    await s.client.enterStep(); expect(s.fetcher.mock.calls.filter(([url]) => url.endsWith('/realtime-config'))).toHaveLength(count + 2);
    s.client.stop();
  });
  it('mostra la trascrizione audio effettiva e segnala l’interruzione', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
    const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    s.event({ type: 'response.created', response: { id: 'spoken', metadata: response.response.metadata } });
    s.event({ type: 'response.output_audio_transcript.delta', response_id: 'spoken', delta: 'Verifica ' });
    s.event({ type: 'response.output_audio_transcript.delta', response_id: 'spoken', delta: 'il materiale.' });
    expect(s.update).toHaveBeenCalledWith({ assistantTranscript: 'Verifica il materiale.' });
    s.client.interrupt(); expect(s.update).toHaveBeenCalledWith({ interrupted: true });
    s.update.mockClear(); s.event({ type: 'response.output_audio_transcript.delta', response_id: 'spoken', delta: 'Tardivo' });
    expect(s.update).not.toHaveBeenCalledWith(expect.objectContaining({ assistantTranscript: expect.any(String) })); s.client.stop();
  });

  it('spiega senza richiedere il microfono e consente di attivarlo e chiuderlo separatamente', async () => {
    const s = setup(); await s.client.start(false); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
    expect(s.media).not.toHaveBeenCalled(); expect(s.pc.addTransceiver).toHaveBeenCalledWith('audio', { direction: 'sendrecv' });
    expect(s.fetcher.mock.calls.some(([url]) => url.endsWith('/realtime-config'))).toBe(true);
    await s.client.enableMicrophone(); expect(s.media).toHaveBeenCalledOnce(); expect(s.sender.replaceTrack).toHaveBeenCalledWith(s.track);
    s.client.disableMicrophone(); expect(s.track.stop).toHaveBeenCalledOnce(); expect(s.sender.replaceTrack).toHaveBeenCalledWith(null);
    expect(s.pc.close).not.toHaveBeenCalled(); s.client.stop();
  });

  it('esegue gli strumenti solo su risposta completa e introduce il nuovo step dopo l’esito', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); s.turn('op', 'Ho fatto tutto avanti'); await vi.advanceTimersByTimeAsync(400);
    const request = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    const c = JSON.parse(String(s.fetcher.mock.calls.find(([url]) => url.endsWith('/session'))![1]?.body)).context;
    const original = s.fetcher.getMockImplementation()!;
    s.fetcher.mockImplementation(async (url, options) => url.endsWith('/realtime-tools') ? { ok: true, json: async () => ({ message: '', sources: [], observations: {}, missing: [], action: { sessionKey: c.sessionKey, visit: c.visit, turn: 'op', intent: 'complete', next: 'birth' } }) } : original(url, options));
    s.update.mockImplementation(u => { if (u.guided) s.client.updateContext({ ...c, step: 'birth', visit: 'next', revision: c.revision + 1, checks: [] }); });
    const item = { type: 'function_call', call_id: 'call-op', name: 'completa_step', arguments: '{}' };
    s.event({ ...item, type: 'response.function_call_arguments.done', response_id: 'r-tool' });
    expect(s.fetcher.mock.calls.some(([url]) => url.endsWith('/realtime-tools'))).toBe(false);
    s.event({ type: 'response.created', response: { id: 'r-tool', metadata: request.response.metadata } });
    s.event({ type: 'response.done', response: { id: 'r-tool', metadata: request.response.metadata, status: 'completed', output: [item] } });
    await vi.advanceTimersByTimeAsync(0);
    const sent = s.channel.send.mock.calls.map(([json]) => JSON.parse(json));
    const output = sent.findIndex(e => e.item?.type === 'function_call_output');
    const entry = sent.findIndex((e, i) => i > output && e.type === 'response.create' && e.response.metadata.mode === 'entry');
    expect(output).toBeGreaterThan(-1); expect(entry).toBeGreaterThan(output);
    expect(JSON.parse(sent[output].item.output).state.step).toBe('birth');
    expect(s.fetcher.mock.calls.some(([url]) => /\/(turn|enter|decide)$/.test(url))).toBe(false);
    s.client.stop();
  });
  it('non esegue una function call contenuta in una risposta cancellata', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); s.turn(); await vi.advanceTimersByTimeAsync(400);
    const request = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    s.event({ type: 'response.done', response: { id: 'cancelled', metadata: request.response.metadata, status: 'cancelled', output: [{ type: 'function_call', call_id: 'bad', name: 'completa_step', arguments: '{}' }] } });
    await vi.advanceTimersByTimeAsync(0); expect(s.fetcher.mock.calls.some(([url]) => url.endsWith('/realtime-tools'))).toBe(false); s.client.stop();
  });
  it('scarta un risultato dello strumento se l’utente riprende a parlare', async () => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); s.turn(); await vi.advanceTimersByTimeAsync(400);
    const request = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    let release!: (v: any) => void; const original = s.fetcher.getMockImplementation()!;
    s.fetcher.mockImplementation((url, options) => url.endsWith('/realtime-tools') ? new Promise(r => { release = r; }) : original(url, options));
    s.event({ type: 'response.done', response: { id: 'waiting', metadata: request.response.metadata, status: 'completed', output: [{ type: 'function_call', call_id: 'waiting', name: 'completa_step', arguments: '{}' }] } });
    await vi.advanceTimersByTimeAsync(0); s.event({ type: 'input_audio_buffer.speech_started', item_id: 'new' });
    release({ ok: true, json: async () => ({ action: { intent: 'complete' } }) }); await vi.advanceTimersByTimeAsync(0);
    expect(s.update.mock.calls.some(([u]) => u.guided)).toBe(false); s.client.stop();
  });

});

it('ripete lo step indicato dalla UI senza riusare lo script o la conversazione precedenti', async () => {
  const s = setup();
  const original = s.fetcher.getMockImplementation()!;
  s.fetcher.mockImplementation(async (url, options) => url.endsWith('/realtime-config') ? { ok: true, json: async () => ({ instructions: 'Procedura completa', entryScript: 'TESTO OBSOLETO DEL CORDONE', tools: realtimeTools }) } : original(url, options));
  await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  const context = { ...contextOf(createSession()), step: 'initial' as const, visit: 'visita-corrente', revision: 4 };
  await s.client.enterStep(context);
  const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).filter(event => event.type === 'response.create').at(-1).response;
  expect(response.metadata.visit).toBe('visita-corrente');
  expect(response.instructions).toContain('passaggio attivo initial');
  expect(response.instructions).toContain('età gestazionale');
  expect(response.instructions).not.toContain('TESTO OBSOLETO');
  expect(response.conversation).toBe('none');
  expect(response.input).toEqual([]);
  s.client.stop();
});


it('apre lo step applicato prima della spiegazione, senza una seconda decisione vocale', async () => {
  const s = setup(); const original = s.fetcher.getMockImplementation()!;
  s.fetcher.mockImplementation(async (url, options) => {
    if (url.endsWith('/utterance')) {
      const body = JSON.parse(String(options?.body));
      return { ok: true, json: async () => ({ ok: true, guided: { message: '', sources: [], observations: {}, missing: [], action: { sessionKey: body.sessionKey, visit: body.visit, turn: body.turn.id, intent: 'birth' } } }) };
    }
    return original(url, options);
  });
  s.update.mockImplementation(update => {
    if (update.guided) s.client.updateContext(contextOf(applyAuthorized(s.session, update.guided.action), 1));
  });
  await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  s.channel.send.mockClear(); s.turn('born-now', 'La piccola è venuta al mondo in questo momento');
  await vi.advanceTimersByTimeAsync(400);
  const responses = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).filter(e => e.type === 'response.create');
  expect(responses).toHaveLength(1);
  expect(responses[0].response.metadata.mode).toBe('entry');
  expect(responses[0].response.instructions).toContain('passaggio attivo cord');
  expect(s.fetcher.mock.calls.some(([url, options]) => url.endsWith('/context') && JSON.parse(String(options?.body)).context.step === 'cord')).toBe(true);
  s.client.stop();
});

it('un cambio di visita cancella subito il parlato e descrive soltanto la visita corrente', async () => {
  const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  const initial = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
  s.event({ type: 'response.created', response: { id: 'previous-speaking', metadata: initial.response.metadata } });
  s.event({ type: 'output_audio_buffer.started', response_id: 'previous-speaking' });
  s.channel.send.mockClear();
  s.client.updateContext({ ...contextOf(s.session), step: 'cord', visit: 'new-cord-visit', revision: 1 });
  const immediate = s.channel.send.mock.calls.map(([json]) => JSON.parse(json));
  expect(immediate).toContainEqual({ type: 'response.cancel', response_id: 'previous-speaking' });
  expect(immediate).toContainEqual({ type: 'output_audio_buffer.clear' });
  await vi.advanceTimersByTimeAsync(0);
  const entries = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).filter(e => e.type === 'response.create');
  expect(entries).toHaveLength(1); expect(entries[0].response.metadata.mode).toBe('entry');
  expect(entries[0].response.instructions).toContain('passaggio attivo cord');
  s.update.mockClear(); s.event({ type: 'response.output_audio_transcript.delta', response_id: 'previous-speaking', delta: 'Risposta vecchia' });
  expect(s.update).not.toHaveBeenCalledWith(expect.objectContaining({ assistantTranscript: 'Risposta vecchia' })); s.client.stop();
});

it('segnala una sola animazione per la stessa risposta audio', async () => {
  const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
  s.event({ type: 'response.created', response: { id: 'single-narration', metadata: response.response.metadata } });
  s.update.mockClear();
  s.event({ type: 'output_audio_buffer.started', response_id: 'single-narration' });
  s.event({ type: 'output_audio_buffer.started', response_id: 'single-narration' });
  expect(s.update.mock.calls.filter(([update]) => update.narrationVisit)).toHaveLength(1);
  s.client.stop();
});

it('usa per il testo la stessa valutazione dei turni vocali e spegne il microfono', async () => {
  const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  s.client.sendText('Un aggiornamento operativo scritto'); await vi.advanceTimersByTimeAsync(400);
  expect(s.track.stop).toHaveBeenCalledOnce();
  const request = s.fetcher.mock.calls.find(([url]) => url.endsWith('/utterance'))!;
  expect(JSON.parse(String(request[1]?.body)).turn.text).toBe('Un aggiornamento operativo scritto');
  expect(s.channel.send.mock.calls.map(([json]) => JSON.parse(json))).toContainEqual(expect.objectContaining({ type: 'conversation.item.create', item: expect.objectContaining({ role: 'user', content: [{ type: 'input_text', text: 'Un aggiornamento operativo scritto' }] }) }));
  s.client.stop();
});
it('accoda il primo messaggio fino alla connessione senza richiedere un microfono', async () => {
  const s = setup(); await s.client.start(false); s.client.sendText('Messaggio iniziale');
  s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(400);
  expect(s.media).not.toHaveBeenCalled();
  const request = s.fetcher.mock.calls.find(([url]) => url.endsWith('/utterance'))!;
  expect(JSON.parse(String(request[1]?.body)).turn.text).toBe('Messaggio iniziale');
  s.client.stop();
});

it('Stop prima della connessione elimina il testo accodato e ignora la sessione tardiva', async () => {
  const s = setup(); await s.client.start(false); s.client.sendText('Messaggio annullato');
  s.client.stop(); s.channel.send.mockClear();
  s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(500);
  expect(s.channel.send).not.toHaveBeenCalled();
  expect(s.fetcher.mock.calls.some(([url]) => url.endsWith('/utterance'))).toBe(false);
  expect(s.media).not.toHaveBeenCalled();
});

it('misura il flusso già aperto e rilascia le risorse di visualizzazione alla chiusura', async () => {
  const s = setup();
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const analyser = { fftSize: 0, smoothingTimeConstant: 0 };
  const context = { createMediaStreamSource: vi.fn(() => source), createAnalyser: () => analyser,
    resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
  vi.stubGlobal('AudioContext', function () { return context; });
  await s.client.start();
  expect(s.media).toHaveBeenCalledOnce();
  expect(context.createMediaStreamSource).toHaveBeenCalledWith(s.stream);
  expect(s.update).toHaveBeenCalledWith({ inputAnalyser: analyser });
  s.client.disableMicrophone(); expect(source.disconnect).toHaveBeenCalledOnce();
  expect(s.update).toHaveBeenCalledWith({ inputAnalyser: null });
  s.client.stop(); expect(context.close).toHaveBeenCalledOnce();
});

it('Stop annulla la valutazione del testo e scarta il risultato tardivo', async () => {
  const s = setup(); const original = s.fetcher.getMockImplementation()!;
  let finish: (value: any) => void = () => {};
  let signal: AbortSignal | undefined;
  s.fetcher.mockImplementation(async (url, options) => {
    if (url.endsWith('/utterance')) {
      signal = options?.signal as AbortSignal;
      return new Promise(resolve => { finish = resolve; });
    }
    return original(url, options);
  });
  await s.client.start(false); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  s.client.sendText('Domanda da interrompere'); await vi.advanceTimersByTimeAsync(400);
  expect(signal).toBeTruthy(); s.client.interrupt(); expect(signal!.aborted).toBe(true);
  s.channel.send.mockClear(); s.update.mockClear();
  finish({ ok: true, json: async () => ({ guided: { action: { intent: 'complete', next: 'birth' } } }) });
  await vi.advanceTimersByTimeAsync(500);
  expect(s.update.mock.calls.some(([update]) => update.guided)).toBe(false);
  expect(s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).some(e => e.type === 'response.create')).toBe(false);
  s.client.stop();
});

it('ribadisce lingua e accento italiani in ogni descrizione audio', async () => {
  const s = setup(); await s.client.start(false); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
  expect(response.response.instructions).toContain('italiano (it-IT)');
  expect(response.response.instructions).toContain('anche se il testo inizia');
  expect(response.response.instructions).toContain('Non adottare accento o cadenza anglofoni');
  s.client.stop();
});

it('ripete la presentazione solo per una richiesta esplicita di ripetizione', async () => {
  const s = setup(); const original = s.fetcher.getMockImplementation()!;
  s.fetcher.mockImplementation(async (url, options) => url.endsWith('/utterance') ? { ok: true, json: async () => ({ guided: { action: { intent: 'repeat' }, message: '', sources: [], observations: {} } }) } : original(url, options));
  await s.client.start(); s.event({ type: 'session.created' }); await vi.advanceTimersByTimeAsync(0);
  s.update.mockClear(); s.channel.send.mockClear(); s.turn('repeat-request', 'Ripeti la spiegazione corrente'); await vi.advanceTimersByTimeAsync(400);
  expect(s.update.mock.calls.filter(([update]) => update.replayVisit)).toHaveLength(1);
  const entry = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
  expect(entry.response.metadata.mode).toBe('entry'); s.client.stop();
});
