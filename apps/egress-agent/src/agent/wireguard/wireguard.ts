import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { endpointOf } from '../../pool/pool.js';

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
  /* The veth carries the WireGuard endpoint; every other packet has the
   * tunnel default. A switch updates this route for the new endpoint. */
  vethName: string;
  vethHostIp: string;
  /* The exit the interface carried before this apply, so its /32 route is
   * removed instead of accumulating across switches. */
  previousEndpoint?: string | null;
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

/* The route to the WireGuard endpoint must be an IPv4 /32 over the veth; a
 * hostname or a v6 endpoint would need a different route than the host has. */
function ipv4HostOf(endpoint: string): string | null {
  const host = endpoint.split(':')[0] ?? '';

  return isIP(host) === 4 ? host : null;
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
  let endpoint: string | null;

  try {
    endpoint = endpointOf(await readFile(file, 'utf8'));
  } catch {
    throw new WireGuardError();
  }

  const nextHost = endpoint === null ? null : ipv4HostOf(endpoint);

  if (nextHost === null) {
    throw new WireGuardError();
  }

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
    /* The new endpoint route exists before the handshake tries to use it. */
    await run('ip', [
      'route',
      'replace',
      `${nextHost}/32`,
      'via',
      options.vethHostIp,
      'dev',
      options.vethName
    ]);
    await run('wg', ['syncconf', options.interfaceName, path]);
  } catch {
    throw new WireGuardError();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const previousHost =
    options.previousEndpoint === undefined || options.previousEndpoint === null
      ? null
      : ipv4HostOf(options.previousEndpoint);

  if (previousHost !== null && previousHost !== nextHost) {
    try {
      await run('ip', [
        'route',
        'del',
        `${previousHost}/32`,
        'dev',
        options.vethName
      ]);
    } catch {
      /* The route may already be gone; the new endpoint is what matters. */
    }
  }
}
