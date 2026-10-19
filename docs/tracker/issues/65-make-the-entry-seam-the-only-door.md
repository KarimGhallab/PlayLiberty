# 65: Make the entry seam the only door

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The entry seam's own contract says every playlist- or track-scoped entry goes through it, but four modules call the raw predicates, and the write rule is written twice.

**Current behavior:**
`entry.ts` states the rule in its header comment (`:6-9`): every playlist- or track-scoped entry goes through the seam, so the access check is part of it rather than a line each entry repeats. Only `playlistService` and `trackService` import it.

The rule is also written twice. `satisfies` decides writability with `access === 'owner' || access === 'write'` (`entry.ts:34`), and `canWritePlaylist` writes the same conjunction (`playlistAccess.ts:134`); ownership is likewise tested in `entry.ts:37` and in `isPlaylistOwner` (`playlistAccess.ts:117`).

Four modules take the other door and call the raw predicates directly: `shareService.ts:34`, `:76` and `:119` (ownership), `syncService.ts:121` (writability), `syncRunService.ts:17` (the resolved level) and `addTrackToPlaylists.ts:35` (writability).

**Desired behavior:**
Every authorization entry point crosses the one seam, and the raw predicates become its interior, so a module cannot grant itself access by importing a helper. The rule is stated once.

**Key interfaces:**

- The existing entry seam: a need, a playlist or track id, and a handler that receives the resolved level.
- The raw predicates stop being exported to features; the seam is their only caller.
- What each route refuses with stays as it is today.

**Acceptance criteria:**

- [ ] No feature module imports a raw predicate.
- [ ] The writability rule and the ownership rule are each written once.
- [ ] Every playlist- and track-scoped entry goes through the seam.
- [ ] The refusal each route answers is unchanged.
- [ ] Tests cover the seam's granted and denied outcomes for the four entry points brought in.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- What owner, write and read mean.
- The audience resolver (issue 33) and the event rules.
- The audit lines (issue 27).

## Observed

- The seam's header states that every playlist-scoped entry goes through it.
- Four modules call the raw predicates instead.
- `owner || write` is written in both `entry.ts` and `playlistAccess.ts`.

## Expected

One door for authorization; the predicates become its interior.

## Evidence

- `apps/server/src/shared/access/entry.ts:6-9`, `:28-37`.
- `apps/server/src/shared/access/playlistAccess.ts:117-135`.
- `apps/server/src/features/shares/shareService.ts:34`, `:76`, `:119`.
- `apps/server/src/features/sync/services/syncService.ts:121`.
- `apps/server/src/features/sync/syncRunService.ts:17`.
- `apps/server/src/features/tracks/addTrackToPlaylists.ts:35`.
- Architecture review 2026-10-16, candidate 7.
