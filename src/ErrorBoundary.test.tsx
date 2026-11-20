import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('offre il recupero quando una schermata si interrompe senza cancellare la sessione', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  sessionStorage.setItem('nls-simulation-v1', 'sessione-esistente');
  function Broken(): never { throw new Error('test'); }
  render(<ErrorBoundary><Broken /></ErrorBoundary>);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ricarica la pagina' })).toBeTruthy();
  expect(sessionStorage.getItem('nls-simulation-v1')).toBe('sessione-esistente');
  sessionStorage.clear();
});
