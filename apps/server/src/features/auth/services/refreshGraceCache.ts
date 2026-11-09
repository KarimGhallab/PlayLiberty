import type { MobileToken } from '@playliberty/contracts';

/* A lost response and a race both replay a token the server has just consumed,
 * so the latest pair is held briefly. Process-local by design: one deployment
 * is one process, and a restart turning a race into reuse is the safe side. */

export const REFRESH_GRACE_MS = 30_000;

interface GraceEntry {
  readonly pair: MobileToken;
  readonly at: number;
}

export class RefreshGraceCache {
  private readonly _entries = new Map<string, GraceEntry>();

  record(familyId: string, pair: MobileToken, at: number): void {
    this._prune(at);
    this._entries.set(familyId, { pair, at });
  }

  pairFor(familyId: string, at: number): MobileToken | null {
    const entry = this._entries.get(familyId);

    if (entry === undefined) {
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
