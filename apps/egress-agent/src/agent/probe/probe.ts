import type {
  EgressAgentConfig,
  EgressFailure,
  EgressProbeFacts,
  YoutubeSource
} from '@playliberty/youtube';
import { classifyEgressFailure } from '@playliberty/youtube';

export class UnknownConfigError extends Error {
  readonly configName: string;

  constructor(configName: string) {
    super(`No config named "${configName}" is in the pool.`);
    this.name = 'UnknownConfigError';
    this.configName = configName;
  }
}

export interface ProbeDeps {
  /* The loaded config after the switch, if one was made. */
  active: () => string | null;
  switchTo: (name: string) => Promise<void>;
  listSource: () => Promise<YoutubeSource>;
  readExitIp: () => Promise<string | null>;
  readHandshake: () => Promise<boolean | null>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/*
 * A probe is three facts: the handshake, the exit address, and one listing
 * extraction. The listing and the address decide the verdict; the handshake is
 * evidence, because a tunnel that has just carried traffic is up even when its
 * last handshake looks old.
 */
export async function probeExit(
  deps: ProbeDeps,
  name?: string
): Promise<EgressProbeFacts> {
  if (name !== undefined) {
    await deps.switchTo(name);
  }

  const handshake = await deps.readHandshake();
  const exitIp = await deps.readExitIp();

  let listing = true;
  let reason: EgressFailure | null = null;

  try {
    await deps.listSource();
  } catch (error) {
    listing = false;
    reason = classifyEgressFailure(messageOf(error));
  }

  if (listing && exitIp === null) {
    reason = 'network';
  }

  const ok = listing && exitIp !== null;

  return {
    handshake,
    listing,
    exitIp,
    reason: ok ? null : (reason ?? 'network'),
    active: deps.active()
  };
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
