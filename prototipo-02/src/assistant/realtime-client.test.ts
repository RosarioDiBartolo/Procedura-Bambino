import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient } from './realtime-client';
import { contextOf } from './protocol';
import { createSession } from '../flow';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup() {
  vi.useFakeTimers();
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  const stream = { getTracks: () => [track] };
  const media = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: media } });
  const channel = { readyState: 'open', send: vi.fn(), close: vi.fn(), onmessage: null as any, onclose: null as any, onerror: null as any };
  const pc = { addTrack: vi.fn(), createDataChannel: () => channel, createOffer: vi.fn().mockResolvedValue({ sdp: 'offer' }), setLocalDescription: vi.fn(), setRemoteDescription: vi.fn(), close: vi.fn(), ontrack: null, onconnectionstatechange: null };
  vi.stubGlobal('RTCPeerConnection', function () { return pc; });
  const audio = { pause: vi.fn(), play: vi.fn().mockResolvedValue(undefined), srcObject: null };
  vi.stubGlobal('Audio', function () { return audio; });
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/session')) return { ok: true, json: async () => ({ token: 'local-token', clientSecret: 'temporary', expiresAt: Date.now() + 1800000 }) };
    if (url.endsWith('/calls')) return { ok: true, text: async () => 'answer' };
    if (url.endsWith('/decide')) return { ok: true, json: async () => ({ type: 'SPEAK', guidelineId: 'preparation:overview', message: 'Verifica il materiale.', priority: 'normal', targetId: 'preparation' }) };
    return { ok: true, json: async () => ({ ok: true }) };
  });
  vi.stubGlobal('fetch', fetcher);
  const update = vi.fn(); const client = new RealtimeClient(contextOf(createSession()), update);
  const event = (e: unknown) => channel.onmessage({ data: JSON.stringify(e) });
  const turn = (id = 'a') => {
    event({ type: 'input_audio_buffer.speech_started', item_id: id }); event({ type: 'input_audio_buffer.speech_stopped', item_id: id });
    event({ type: 'input_audio_buffer.committed', item_id: id }); event({ type: 'conversation.item.input_audio_transcription.completed', item_id: id, transcript: 'Cosa preparo?' });
  };
  return { client, update, track, media, stream, pc, audio, fetcher, event, turn, channel };
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
    expect(response.response.input).toEqual([]); expect(response.response.conversation).toBe('none');
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
    await vi.advanceTimersByTimeAsync(400); expect(s.fetcher.mock.calls.some(([url]) => url.endsWith('/decide'))).toBe(false); s.client.stop();
  });
  it.each(['done-first', 'playback-first'])('attende generazione e riproduzione (%s)', async order => {
    const s = setup(); await s.client.start(); s.event({ type: 'session.created' }); s.turn(); await vi.advanceTimersByTimeAsync(400);
    const response = s.channel.send.mock.calls.map(([json]) => JSON.parse(json)).find(e => e.type === 'response.create');
    const data = { id: 'r1', metadata: response.response.metadata, status: 'completed' };
    s.event({ type: 'response.created', response: data }); s.event({ type: 'output_audio_buffer.started', response_id: 'r1' });
    const done = { type: 'response.done', response: data }; const stopped = { type: 'output_audio_buffer.stopped', response_id: 'r1' };
    s.event(order === 'done-first' ? done : stopped); s.update.mockClear(); s.event(order === 'done-first' ? stopped : done);
    expect(s.update).toHaveBeenCalledWith({ state: 'listening' }); s.client.stop();
  });
});
