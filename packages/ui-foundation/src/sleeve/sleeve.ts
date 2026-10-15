/*
 * The sleeve a playlist draws when it has no artwork.
 *
 * A playlist with no `coverUrl` still carries an identity, so the placeholder
 * carries one too, and it is derived from the playlist's own id rather than
 * stored: the same playlist keeps its sleeve across reloads and on every client,
 * and nothing has to persist, migrate or backfill a colour.
 *
 * The hash is FNV-1a over the id's code units and the result indexes the six
 * sleeve tokens. Only which sleeve is derived; the sleeve itself is a value the
 * design system has already drawn and measured, not one computed at run time.
 */

const SLEEVE_COUNT = 6;

/**
 * The one-based index of the sleeve a playlist draws. Deterministic for an id,
 * stable across clients and reloads because it reads nothing but the id.
 */
export function sleeveIndex(playlistId: string): number {
  let hash = 2166136261;

  for (let index = 0; index < playlistId.length; index += 1) {
    hash ^= playlistId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % SLEEVE_COUNT) + 1;
}
