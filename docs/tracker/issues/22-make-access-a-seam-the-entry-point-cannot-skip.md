# 22: Make access a seam the entry point cannot skip

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The playlist and track access rules are centralized, but each of the eleven service entry points hand-writes the guard, so a new entry point can silently omit it, and the two modules encode the outcome two ways.

**Current behavior:**
The playlist service's seven entry points and the track service's four each call the access module and write their own guard, turning the result into a 404 or a 403. Nothing structural forces a new entry point to check. The two access modules use different conventions: playlist access returns `null` for no access (rendered as 404), track access returns a boolean (rendered as 403).

**Desired behavior:**
The guard folds into the entry seam, so an entry point cannot be written without it, and one outcome convention replaces the two. The observable access behaviour (who sees what, and which status a refusal carries) is unchanged unless the two conventions are deliberately reconciled.

**Key interfaces:**

- The entry seam wraps the access check and the handler, so the check is not optional.
- One outcome convention for a refusal.
- The rules themselves stay in the access modules.

**Acceptance criteria:**

- [x] An entry point cannot be written without the access check.
- [x] One outcome convention replaces the two, or the two are documented as deliberate and enforced.
- [x] The observable access behaviour is unchanged.
- [x] A test proves a new entry point inherits the guard.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The rules' logic (who may read, write, manage).
- The live-event audience, which shares the access module.
- The database access pattern.

## Outcome

Done. The guard is part of the entry seam, and the eleven entry points cross it.

- A new `shared/access/entry.ts` is the seam. `playlistEntry(database, playlistId, accountId, need, handler)` resolves the access, checks it against an `AccessNeed` (`read`, `write`, `owner`), and runs the handler only when it grants; `trackEntry` does the same for a track. The handler is handed the resolved level where there is one, so a view it builds cannot disagree with the check that let it through.
- The playlist service's six playlist-scoped entry points (read, rename, set-skip, delete, remove-track, list-tracks) and the track service's four (stream, thumbnail, retry, fetch-whole) are written through the seam. The library list is the exception in shape: its access is the `playlistVisibleTo` filter itself, so it has no single playlist id to guard.
- An entry point cannot be written without the check because the guard predicates are out of the services' scope: `trackService` no longer imports `trackAccess`, and `playlistService` imports only the library list's readers from `playlistAccess`, never `resolvePlaylistAccess`, `isPlaylistOwner` or `canWritePlaylist`. The seam is the only way a playlist- or track-scoped entry point reaches the rules, and the handler runs only inside it.
- One outcome convention at the boundary. The two rules keep their own shapes on purpose, documented in the seam: a playlist resolves to a level or to nothing, a track resolves to a boolean. The seam turns either into `Entry<Result>`, one `granted`/`denied` shape, so a caller never branches on `null` versus `true` again.
- A denial is not a status. The route owns the mapping, unchanged: a playlist refusal is a 404, a track read refusal is a 403, a track write refusal is a 404. The order is preserved too, so a missing track is still a 404 before a stranger's 403 on the stream.

Tests: a new `entry.test.ts` writes entry points that did not exist before (handlers handed to `playlistEntry` and `trackEntry`) and shows the guard is on them: each need is granted to exactly the accounts that satisfy it, denied to the rest, and the handler never runs on a denial. The existing route and share tests, which pin the observable behaviour, are unchanged and pass.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (server 325, web 396, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.

## Observed

- Eleven service entry points each call the access module and write a guard.
- `playlistAccess` returns `null`/404; `trackAccess` returns a boolean/403.
- Nothing structural forces the check.

## Expected

The guard is part of the entry seam, so a new entry point cannot omit it.

## Evidence

- The access call sites across the playlist and track services.
- Architecture review, candidate 7, "Make access a seam the entry point cannot skip".
