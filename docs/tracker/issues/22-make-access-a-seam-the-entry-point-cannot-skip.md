# 22: Make access a seam the entry point cannot skip

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The guard is part of the entry seam, and the eleven entry points cross it.

- A new `shared/access/entry.ts` is the seam. `playlistEntry(database, playlistId, accountId, need, handler)` resolves the access, checks it against an `AccessNeed` (`read`, `write`, `owner`), and runs the handler only when it grants; `trackEntry` does the same for a track. The handler is handed the resolved level where there is one, so a view it builds cannot disagree with the check that let it through.
- The playlist service's six playlist-scoped entry points (read, rename, set-skip, delete, remove-track, list-tracks) and the track service's four (stream, thumbnail, retry, fetch-whole) are written through the seam. The library list is the exception in shape: its access is the `playlistVisibleTo` filter itself, so it has no single playlist id to guard.
- An entry point cannot be written without the check because the guard predicates are out of the services' scope: `trackService` no longer imports `trackAccess`, and `playlistService` imports only the library list's readers from `playlistAccess`, never `resolvePlaylistAccess`, `isPlaylistOwner` or `canWritePlaylist`. The seam is the only way a playlist- or track-scoped entry point reaches the rules, and the handler runs only inside it.
- One outcome convention at the boundary. The two rules keep their own shapes on purpose, documented in the seam: a playlist resolves to a level or to nothing, a track resolves to a boolean. The seam turns either into `Entry<Result>`, one `granted`/`denied` shape, so a caller never branches on `null` versus `true` again.
- A denial is not a status. The route owns the mapping, unchanged: a playlist refusal is a 404, a track read refusal is a 403, a track write refusal is a 404. The order is preserved too, so a missing track is still a 404 before a stranger's 403 on the stream.

Tests: a new `entry.test.ts` writes entry points that did not exist before (handlers handed to `playlistEntry` and `trackEntry`) and shows the guard is on them: each need is granted to exactly the accounts that satisfy it, denied to the rest, and the handler never runs on a denial. The existing route and share tests, which pin the observable behaviour, are unchanged and pass.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (server 325, web 396, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.
