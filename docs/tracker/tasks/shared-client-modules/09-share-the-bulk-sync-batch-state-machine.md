# 09: Share the bulk sync batch state machine

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/api-client` exports `useBulkSync` with `count`, `busy`, `notice`, `start` and `dismissNotice`. The hook takes the sync-all mutation from the caller, so each client keeps the mutation hook at its own seam and the shared hook owns only the batch state.

The frozen count and the settle rule sit in `bulkSyncStatus` and `bulkSyncSettled`, and the hook calls both. The web library page passes `useSyncAllPlaylists` into the hook, drops its batch, notice and settle state, and withdraws the notice on the shared window. The mobile gallery imports the hook from `api-client`, and its local hook is deleted.
