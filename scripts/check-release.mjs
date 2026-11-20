import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const errors = [];
const manifest = JSON.parse(readFileSync('public/audio/qwen/manifest.json', 'utf8'));
const scripts = JSON.parse(readFileSync('docs/audio/scripts-it.json', 'utf8'));
const ids = new Set();
for (const script of scripts) {
  if (ids.has(script.id)) errors.push(`Testo duplicato: ${script.id}`);
  ids.add(script.id);
  const clips = manifest.clips.filter(clip => clip.id === script.id);
  if (clips.length !== 1) { errors.push(`Audio mancante o duplicato: ${script.id}`); continue; }
  const clip = clips[0];
  if (clip.text !== script.text) errors.push(`Testo del manifest diverso dalla sorgente: ${script.id}`);
  if (clip.file !== `${script.id}.wav`) { errors.push(`Nome file inatteso: ${script.id}`); continue; }
  const file = resolve('public/audio/qwen', clip.file);
  if (!existsSync(file)) { errors.push(`File mancante: ${clip.file}`); continue; }
  const bytes = readFileSync(file);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') errors.push(`WAV non valido: ${clip.file}`);
  if (createHash('sha256').update(bytes).digest('hex') !== clip.sha256_audio) errors.push(`Impronta audio diversa: ${clip.file}`);
}
for (const clip of manifest.clips) if (!ids.has(clip.id)) errors.push(`Audio privo di testo sorgente: ${clip.id}`);
const publicAssets = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
for (const group of Object.values(publicAssets)) for (const file of Object.values(group)) {
  if (!existsSync(resolve('public', file))) errors.push(`Risorsa pubblica mancante: ${file}`);
}
if (!existsSync('fonti/Poster Rianimazione 2025 DEFINITIVO.pdf')) errors.push('PDF sorgente mancante');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Risorse verificate: ${ids.size} registrazioni, testi, impronte e file pubblici. La verifica automatica non certifica contenuti clinici o diritti sui materiali.`);
