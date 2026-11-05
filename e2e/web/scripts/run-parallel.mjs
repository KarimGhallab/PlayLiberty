import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/*
 * One Playwright process runs one isolated stack per worker, so its list
 * reporter keeps the terminal UI and colors. The root script builds first.
 */

const root = fileURLToPath(new URL('../../../', import.meta.url));
const requested = process.argv[2] ?? process.env.E2E_SHARDS ?? '4';
const workers = Number(requested);

if (!Number.isInteger(workers) || workers < 1) {
  throw new Error(
    `The worker count must be a positive integer, not "${requested}".`
  );
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const environment = { ...process.env };

delete environment.E2E_INSTANCE;

const child = spawn(
  pnpm,
  ['--filter', '@playliberty/e2e-web', 'exec', 'playwright', 'test'],
  {
    cwd: root,
    env: { ...environment, E2E_INSTANCES: String(workers) },
    stdio: 'inherit'
  }
);

child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('close', code => {
  process.exitCode = code ?? 1;
});
