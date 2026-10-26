import type { ChildRegistry } from '../processes/processes.js';

export const DEFAULT_DRAIN_TIMEOUT_MS = 60_000;

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
