import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const app = fileURLToPath(new URL('../prototipo-02/', import.meta.url));
const require = createRequire(new URL('../prototipo-02/package.json', import.meta.url));
const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.ts'], { cwd: app, stdio: 'inherit' }),
  spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', '5180', '--strictPort'], { cwd: app, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(c => c.kill()); process.exitCode = code; }
children.forEach(c => { c.on('error', () => stop(1)); c.on('exit', code => stop(code ?? 0)); });
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
