import type { EgressAgentConfig } from '@playliberty/youtube';

import { readPool } from '../../pool/pool.js';
import type { ChildRegistry } from '../processes/processes.js';
import { NoInterfaceError } from '../wireguard/wireguard.js';

export const DEFAULT_DRAIN_TIMEOUT_MS = 60_000;

export class UnknownConfigError extends Error {
  readonly configName: string;

  constructor(configName: string) {
    super(`No config named "${configName}" is in the pool.`);
    this.name = 'UnknownConfigError';
    this.configName = configName;
  }
}

/* A read or a download killed by the switch is not the source's failure. */
export class SwitchInterruptedError extends Error {
  constructor() {
    super('The exit switched while the operation was running.');
    this.name = 'SwitchInterruptedError';
  }
}

export interface SwitchDeps {
  registry: ChildRegistry;
  apply: (name: string) => Promise<void>;
}

export interface SwitchToOptions extends SwitchDeps {
  poolDirectory: string;
  /* Null until the host has a namespace and an interface; a switch then has
   * nowhere to apply and must say so rather than pretend. */
  interfaceName: string | null;
  onSwitched: (name: string) => void | Promise<void>;
}

/*
 * The one switch: drain what is running, kill what outlived the drain, then
 * apply the config. The interruption window is the registry's, so a route that
 * answers after the kill still reports the switch rather than the source.
 */
export async function switchExit(
  deps: SwitchDeps,
  name: string,
  drainTimeoutMs: number
): Promise<void> {
  deps.registry.beginSwitch();

  try {
    await deps.registry.drain(drainTimeoutMs);
    deps.registry.killAll();
    await deps.apply(name);
  } finally {
    deps.registry.endSwitch();
  }
}

/*
 * A named switch: the config must be usable, the interface must exist, and the
 * loaded name moves only after the apply succeeds. The caller owns the name and
 * the loaded time through `onSwitched`.
 */
export async function switchTo(
  name: string,
  options: SwitchToOptions,
  drainTimeoutMs: number = DEFAULT_DRAIN_TIMEOUT_MS
): Promise<void> {
  await requireInPool(await readPool(options.poolDirectory), name);

  /* Checked before the drain, so a host without an interface does not kill
   * in-flight work it cannot replace. */
  if (options.interfaceName === null) {
    throw new NoInterfaceError();
  }

  await switchExit(options, name, drainTimeoutMs);
  await options.onSwitched(name);
}

/* Kept for the caller that already holds the pool: a switch is a membership
 * check plus one assignment, and the unit will apply it to the interface. */
export async function requireInPool(
  pool: readonly EgressAgentConfig[],
  name: string
): Promise<void> {
  const config = pool.find(entry => entry.name === name);

  /* A config with no endpoint has no exit to test, so it is refused like a
   * name that is not in the pool at all. */
  if (config === undefined || config.endpoint === null) {
    throw new UnknownConfigError(name);
  }
}
