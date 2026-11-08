# 06: Share the write permission and the action lists

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The policy lives in the new `@playliberty/library` package: `canWritePlaylist`, `playlistActionsFor`, `trackActionsFor`, `deleteIntentFor`, `scopedPlaylists`, `visiblePlaylists`, `syncablePlaylists`, `batchBusy`, `bulkSyncNoticeFor`, `LibraryScope` and `SyncAllOutcome`. The outcome's `stopped` is the server's `Problem`, and `api-client` maps `ApiError.problem` at the batch boundary, so the notice builder never sees an error object.

Web maps the shared keys to its icons and handlers in `playlistActions.tsx` and `TrackRow.tsx`; the row now takes the skip setting, so Fetch whole follows the same rule on both clients. The library page uses the shared scope, status, syncable, batch and notice helpers. Mobile sheets import the shared action types, and `bulkSync.ts` keeps only the stateful hook. The mobile `canWritePlaylist`, playlist-action and track-action copies are deleted.
