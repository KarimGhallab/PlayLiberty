/*
 * The sleeve a playlist with no artwork draws, derived from the playlist id
 * rather than stored: the same playlist keeps it across reloads and clients,
 * and nothing has to persist, migrate or backfill a colour.
 */

const SLEEVE_COUNT = 6;

/** The one-based index of that sleeve: deterministic because it reads only the
 * id. */
export function sleeveIndex(playlistId: string): number {
  let hash = 2166136261;

  for (let index = 0; index < playlistId.length; index += 1) {
    hash ^= playlistId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % SLEEVE_COUNT) + 1;
}
