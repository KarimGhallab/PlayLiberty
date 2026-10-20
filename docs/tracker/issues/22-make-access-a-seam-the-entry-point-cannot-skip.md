# 22: Make access a seam the entry point cannot skip

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

The guard is part of the entry seam, and the eleven entry points cross it. A new `shared/access/entry.ts` exposes `playlistEntry(database, playlistId, accountId, need, handler)`, which resolves the access, checks it against an `AccessNeed` (`read`, `write`, `owner`) and runs the handler only when it grants, and `trackEntry` for a track, handing the handler the resolved level where there is one. The playlist service's six playlist-scoped entry points (read, rename, set-skip, delete, remove-track, list-tracks) and the track service's four (stream, thumbnail, retry, fetch-whole) are written through the seam, with the library list the exception in shape because its access is the `playlistVisibleTo` filter itself. The guard predicates are out of the services' scope, so an entry point cannot be written without the check, and the seam turns either rule into one `Entry<Result>` `granted`/`denied` shape, while the route keeps its unchanged denial mapping (a playlist refusal is a 404, a track read refusal is a 403, a track write refusal is a 404).
