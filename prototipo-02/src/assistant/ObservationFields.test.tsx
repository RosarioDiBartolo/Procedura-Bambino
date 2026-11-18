import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider, useSession } from '../SessionContext';
import { createSession, type StepId } from '../flow';
import { ObservationFields } from './ObservationFields';
afterEach(() => { cleanup(); sessionStorage.clear(); });
function Current() { const [s] = useSession(); return <><output aria-label="Step corrente">{s.step}</output><ObservationFields step={s.step} /></>; }
function setup(step: StepId) {
  sessionStorage.setItem('nls-simulation-v1', JSON.stringify({ ...createSession(1), step }));
  render(<MemoryRouter><SessionProvider><Current /></SessionProvider></MemoryRouter>);
  return userEvent.setup();
}
describe('Conferma dei dati manuali', () => {
  it('attende Invio e considera 100 nel ramo almeno 100', async () => {
    const user = setup('hr100'); const field = screen.getByRole('spinbutton');
    await user.type(field, '100'); expect(screen.getByLabelText('Step corrente').textContent).toBe('hr100');
    await user.keyboard('{Enter}'); expect(screen.getByLabelText('Step corrente').textContent).toBe('post');
  });
  it('conferma uscendo dal campo e include esattamente 60', async () => {
    const user = setup('hr60'); await user.type(screen.getByRole('spinbutton'), '60');
    expect(screen.getByLabelText('Step corrente').textContent).toBe('hr60');
    await user.tab(); expect(screen.getByLabelText('Step corrente').textContent).toBe('hr100');
  });
  it('sotto 60 richiede efficacia esplicita; no torna ai correttivi', async () => {
    const user = setup('hr60'); await user.type(screen.getByRole('spinbutton'), '50'); await user.tab();
    expect(screen.getByLabelText('Step corrente').textContent).toBe('hr60');
    await user.selectOptions(screen.getByRole('combobox'), 'no'); expect(screen.getByLabelText('Step corrente').textContent).toBe('correctives');
  });
  it('basta un singolo riscontro positivo certo per una condizione oppure', async () => {
    const user = setup('distress'); await user.selectOptions(screen.getByRole('combobox', { name: 'È presente cianosi persistente?' }), 'yes');
    expect(screen.getByLabelText('Step corrente').textContent).toBe('distress-support');
  });
});
