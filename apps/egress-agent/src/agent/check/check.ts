import type { EgressCheckFacts, YoutubeSource } from '@playliberty/youtube';
import { SourceFailureKind, classifySourceFailure } from '@playliberty/youtube';

export interface CheckDeps {
  /* The loaded config; a check never changes it. */
  active: () => string | null;
  listSource: () => Promise<YoutubeSource>;
  readExitIp: () => Promise<string | null>;
  readHandshake: () => Promise<boolean | null>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/*
 * A check is the facts the loaded config reports: the handshake, the exit
 * address, and one listing extraction with what it said when it failed. The
 * server decides the verdict. The handshake is evidence, because a tunnel that
 * has just carried traffic is up even when its last handshake looks old.
 */
export async function checkActive(deps: CheckDeps): Promise<EgressCheckFacts> {
  const handshake = await deps.readHandshake();
  const exitIp = await deps.readExitIp();

  let listing = true;
  let failure: SourceFailureKind | null = null;

  try {
    await deps.listSource();
  } catch (error) {
    listing = false;
    failure = classifySourceFailure(messageOf(error));
  }

  return {
    handshake,
    listing,
    exitIp,
    failure,
    active: deps.active()
  };
}
