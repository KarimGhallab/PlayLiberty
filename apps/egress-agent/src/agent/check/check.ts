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
 * A check is three facts about the loaded config: the handshake, the exit
 * address, and one listing extraction. The listing and the address decide the
 * verdict; the handshake is evidence, because a tunnel that has just carried
 * traffic is up even when its last handshake looks old.
 */
export async function checkActive(deps: CheckDeps): Promise<EgressCheckFacts> {
  const handshake = await deps.readHandshake();
  const exitIp = await deps.readExitIp();

  let listing = true;
  let reason: SourceFailureKind | null = null;

  try {
    await deps.listSource();
  } catch (error) {
    listing = false;
    reason = classifySourceFailure(messageOf(error));
  }

  if (listing && exitIp === null) {
    reason = SourceFailureKind.Network;
  }

  const ok = listing && exitIp !== null;

  return {
    handshake,
    listing,
    exitIp,
    reason: ok ? null : (reason ?? SourceFailureKind.Network),
    active: deps.active()
  };
}
