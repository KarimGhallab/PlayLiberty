import type { MobileToken } from '@playliberty/contracts';

/* A lost response and a race replay the token just consumed, so its pair is
 * held briefly. The entry names that token, so an older token cannot claim it.
 * Process-local: a restart turning a race into reuse is the safe side. */

export const REFRESH_GRACE_MS = 30_000;

interface GraceEntry {
  readonly tokenHash: string;
  readonly pair: MobileToken;
  readonly at: number;
}

export class RefreshGraceCache {
  private readonly _entries = new Map<string, GraceEntry>();

  record(
    familyId: string,
    tokenHash: string,
    pair: MobileToken,
    at: number
  ): void {
    this._prune(at);
    this._entries.set(familyId, { tokenHash, pair, at });
  }

  pairFor(familyId: string, tokenHash: string, at: number): MobileToken | null {
    const entry = this._entries.get(familyId);

    if (entry === undefined || entry.tokenHash !== tokenHash) {
      return null;
    }

    if (at - entry.at > REFRESH_GRACE_MS) {
      this._entries.delete(familyId);
      return null;
    }

    return entry.pair;
  }

  drop(familyId: string): void {
    this._entries.delete(familyId);
  }

  private _prune(at: number): void {
    for (const [familyId, entry] of this._entries) {
      if (at - entry.at > REFRESH_GRACE_MS) {
        this._entries.delete(familyId);
      }
    }
  }
}
