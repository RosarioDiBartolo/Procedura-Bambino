import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AIVoiceInput } from './ai-voice-input';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('notifica una sola attivazione e una sola chiusura, conservando la durata reale', () => {
  vi.useFakeTimers();
  const start = vi.fn(), stop = vi.fn();
  const view = render(<AIVoiceInput recording={false} onStart={start} onStop={stop} />);
  expect(stop).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Attiva microfono' }));
  expect(start).toHaveBeenCalledOnce();
  view.rerender(<AIVoiceInput recording onStart={start} onStop={stop} />);
  act(() => { vi.advanceTimersByTime(2500); });
  expect(screen.getByText('00:02')).toBeTruthy();
  expect(start).toHaveBeenCalledOnce(); expect(stop).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Disattiva microfono' }));
  expect(stop).toHaveBeenCalledExactlyOnceWith(2);
});

it('non mostra un ascolto fittizio quando il microfono non è stato attivato', () => {
  vi.useFakeTimers();
  render(<AIVoiceInput recording={false} onStart={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Attiva microfono' }));
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.getByRole('button', { name: 'Attiva microfono' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByText('00:00')).toBeTruthy();
});
