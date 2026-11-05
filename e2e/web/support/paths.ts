import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* The paths the config and the tests both need, so the server starts on the
 * file the tests write and every worker has one isolated stack. */

export interface E2eInstance {
  readonly index: number;
  readonly serverPort: number;
  readonly webPort: number;
  readonly serverUrl: string;
  readonly webUrl: string;
  readonly fakeScript: string;
  readonly mediaRoot: string;
  readonly databasePath: string;
  readonly viteCacheDir: string;
  readonly testResultsDir: string;
}

function nonNegativeInteger(value: string, name: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, not "${value}".`);
  }

  return parsed;
}

function positiveInteger(value: string, name: string): number {
  const parsed = nonNegativeInteger(value, name);

  if (parsed === 0) {
    throw new Error(`${name} must be a positive integer, not "${value}".`);
  }

  return parsed;
}

const here = (name: string): string =>
  fileURLToPath(new URL(`../${name}`, import.meta.url));

export const ROOT_DIR = fileURLToPath(new URL('../../../', import.meta.url));
export const TEST_RESULTS_ROOT = here('test-results');

export function instancePaths(index: number): E2eInstance {
  const instance = nonNegativeInteger(String(index), 'instance');
  const serverPort = 8081 + instance * 10;
  const webPort = 5273 + instance * 10;

  return {
    index: instance,
    serverPort,
    webPort,
    serverUrl: `http://127.0.0.1:${serverPort}`,
    webUrl: `http://127.0.0.1:${webPort}`,
    fakeScript: here(`.scenario/${instance}.json`),
    mediaRoot: here(`.media/${instance}`),
    databasePath: here(`.data/${instance}/playliberty.db`),
    viteCacheDir: join(
      ROOT_DIR,
      'apps/web/node_modules/.vite',
      `e2e-${instance}`
    ),
    testResultsDir: here(`test-results/${instance}`)
  };
}

/* One process runs all workers, or a CI shard runs one explicit instance. */
export function e2eInstanceIndices(): number[] {
  const explicit = process.env.E2E_INSTANCE;

  if (explicit !== undefined) {
    return [nonNegativeInteger(explicit, 'E2E_INSTANCE')];
  }

  const count = positiveInteger(
    process.env.E2E_INSTANCES ?? '1',
    'E2E_INSTANCES'
  );

  return Array.from({ length: count }, (_, index) => index);
}

function workerIndex(): number {
  const explicit = process.env.E2E_INSTANCE;

  if (explicit !== undefined) {
    return nonNegativeInteger(explicit, 'E2E_INSTANCE');
  }

  return nonNegativeInteger(
    process.env.TEST_PARALLEL_INDEX ?? '0',
    'TEST_PARALLEL_INDEX'
  );
}

export function instanceForWorker(parallelIndex: number): number {
  return process.env.E2E_INSTANCE === undefined ? parallelIndex : workerIndex();
}

export const E2E_INSTANCE = workerIndex();

const current = instancePaths(E2E_INSTANCE);

export const SERVER_PORT = current.serverPort;
export const WEB_PORT = current.webPort;
export const FAKE_SCRIPT = current.fakeScript;
export const MEDIA_ROOT = current.mediaRoot;
export const DATABASE_PATH = current.databasePath;
export const VITE_CACHE_DIR = current.viteCacheDir;
export const TEST_RESULTS_DIR = current.testResultsDir;
