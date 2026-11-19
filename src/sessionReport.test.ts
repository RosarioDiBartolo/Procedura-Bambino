import { expect, it } from 'vitest';
import { createSession, move, record } from './flow';
import { buildSessionReport } from './sessionReport';
it('distingue report parziale e concluso e conserva cronologia e valutazioni', () => {
  const start = Date.UTC(2026,10,19,12);
  let session = move(createSession(start), 'birth', start + 1000, 'Preparazione completata');
  session = record(session, {at:start+2000,step:'birth',type:'assessment',text:'Caso selezionato',answers:{hr:80,effective:true}});
  const html = buildSessionReport(session, start + 60000);
  const doc = new DOMParser().parseFromString(html,'text/html');
  expect(doc.querySelector('h1')?.textContent).toBe('Report della simulazione');
  expect(doc.querySelectorAll('h2')).toHaveLength(3);
  expect(doc.body.textContent).toContain('In corso — report parziale');
  expect(doc.body.textContent).toContain('01:00');
  expect(doc.body.textContent).toContain('80 battiti/min');
  expect(doc.body.textContent).toContain('Ventilazione efficace: Sì');
  const table = doc.querySelectorAll('table')[1];
  expect(table.textContent!.indexOf('Preparazione completata')).toBeLessThan(table.textContent!.indexOf('Caso selezionato'));
  expect(buildSessionReport({...session,finishedAt:start+30000}, start+90000)).toContain('<dd>00:30</dd>');
});
it('mostra uno stato vuoto leggibile e neutralizza contenuto HTML negli eventi', () => {
  const empty = createSession(1000);
  expect(buildSessionReport(empty,2000)).toContain('Nessun evento registrato.');
  const session = record(empty,{at:2000,step:'preparation',type:'action',text:'<img src=x onerror=alert(1)>'});
  const doc = new DOMParser().parseFromString(buildSessionReport(session,3000),'text/html');
  expect(doc.querySelector('img')).toBeNull();
  expect(doc.body.textContent).toContain('<img src=x onerror=alert(1)>');
});
