# 06: Share the write permission and the action lists

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-scaffold-the-shared-client-packages.md).

## Observed

The owner-or-write rule exists three times: in the web actions module, in the mobile access module and again in the mobile bulk sync. Each client gates the same actions separately. Web builds the playlist menu and the track lane inline. Mobile has a playlist action module and a track action module. The bulk-sync set is five pure helpers on mobile and inline in the web library page.

The two clients also disagree on what a refusal is. The web Sync all carries the thrown error. The mobile one carries the same error and unwraps it at the notice.

## Expected

`@playliberty/library` owns the permission and the four lists: the playlist actions, the track actions, the syncable set and the batch busy rule. The lists carry action keys and label keys. Each app maps a key to a glyph and a control, so no icon and no rendered component enters the package.

Sync all reports a refused press as a problem, not as an error object, so the notice builder needs no API type.

## Evidence

- `canWritePlaylist` in the web actions module, the mobile access module and the mobile bulk sync.
- Web playlist menu and track lane: inline in `playlistActions.tsx` and `TrackRow.tsx`.
- Mobile copies: `playlistActions.ts` (68 lines) and `trackActions.ts` (40 lines).
- Bulk sync: `bulkSync.ts` (180 lines) on mobile, inline in `LibraryPage.tsx` on web, with the same strings and branches.
- The owner keeps delete, rename and the shares. A write collaborator adds, removes and syncs.

## Acceptance criteria

- [x] `library` owns the permission and the playlist action list, the track action list, the syncable set and the batch busy rule.
- [x] The package imports no icon set and no rendered component.
- [x] Both apps map action keys to their own glyphs and controls.
- [x] Sync all carries a problem, and the notice builder uses the problem, not an error object.
- [x] The owner-only actions stay owner-only, and a read share holds none of the writes.
- [x] The web inline gating and the mobile copies are deleted.

## Outcome

The policy lives in the new `@playliberty/library` package: `canWritePlaylist`, `playlistActionsFor`, `trackActionsFor`, `deleteIntentFor`, `scopedPlaylists`, `visiblePlaylists`, `syncablePlaylists`, `batchBusy`, `bulkSyncNoticeFor`, `LibraryScope` and `SyncAllOutcome`. The outcome's `stopped` is the server's `Problem`, and `api-client` maps `ApiError.problem` at the batch boundary, so the notice builder never sees an error object.

Web maps the shared keys to its icons and handlers in `playlistActions.tsx` and `TrackRow.tsx`; the row now takes the skip setting, so Fetch whole follows the same rule on both clients. The library page uses the shared scope, status, syncable, batch and notice helpers. Mobile sheets import the shared action types, and `bulkSync.ts` keeps only the stateful hook. The mobile `canWritePlaylist`, playlist-action and track-action copies are deleted.

Verification: `pnpm run build` and `pnpm run lint:check` pass; the library package runs 25 tests; `pnpm run test:unit` passes across the workspace.

## Verification

The package suite covers the access matrix (owner, write, read, unloaded), the busy row, the failed row with and without the skip setting, and a refused Sync all. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
