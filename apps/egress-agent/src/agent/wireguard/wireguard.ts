import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const WG_TIMEOUT_MS = 10_000;

export type RunCommand = (
  command: string,
  args: string[]
) => Promise<{ stdout: string }>;

export interface WireGuardOptions {
  /* Null until the host has a namespace and an interface; a switch then has
   * nowhere to apply and must say so rather than pretend. */
  interfaceName: string | null;
  poolDirectory: string;
  run?: RunCommand;
}

/* The message is a fixed sentence, never the command's stderr. */
export class WireGuardError extends Error {
  constructor() {
    super('The WireGuard interface could not be updated.');
    this.name = 'WireGuardError';
  }
}

export class NoInterfaceError extends Error {
  constructor() {
    super('No WireGuard interface is configured.');
    this.name = 'NoInterfaceError';
  }
}

async function defaultRun(
  command: string,
  args: string[]
): Promise<{ stdout: string }> {
  const { stdout } = await execFileAsync(command, args, {
    timeout: WG_TIMEOUT_MS
  });

  return { stdout };
}

/*
 * `wg syncconf` takes the wg-only keys; a Proton file also carries `Address`
 * and `DNS`, which the unit applies once at boot. `wg-quick strip` removes
 * them, and the stripped file is private to this call.
 */
export async function applyConfig(
  options: WireGuardOptions,
  name: string
): Promise<void> {
  if (options.interfaceName === null) {
    throw new NoInterfaceError();
  }

  const run = options.run ?? defaultRun;
  const file = join(options.poolDirectory, `${name}.conf`);
  let stripped: string;

  try {
    stripped = (await run('wg-quick', ['strip', file])).stdout;
  } catch {
    throw new WireGuardError();
  }

  const directory = await mkdtemp(join(tmpdir(), 'playliberty-wg-'));
  const path = join(directory, 'config.conf');

  try {
    await writeFile(path, stripped, { mode: 0o600 });
    await run('wg', ['syncconf', options.interfaceName, path]);
  } catch {
    throw new WireGuardError();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
