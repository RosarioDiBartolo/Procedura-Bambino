import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { steps } from './flow';
it('include un audio per ogni step e per la conclusione', () => {
  for (const id of [...Object.keys(steps), 'finished']) {
    expect(existsSync(resolve('public/audio/qwen', `${id}.wav`)), id).toBe(true);
  }
});
it('risolve logo, favicon, poster e sorgente PDF dopo la riorganizzazione', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.json','utf8'));
  for (const group of Object.values(manifest) as Record<string,string>[]) {
    for (const path of Object.values(group)) expect(existsSync(resolve('public',path)),path).toBe(true);
  }
});
