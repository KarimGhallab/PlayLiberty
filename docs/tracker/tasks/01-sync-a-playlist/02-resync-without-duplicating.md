# 02: Resync a playlist without duplicating

**Status:** resolved

## Outcome

`POST /playlists/:id/sync` starts a run on an existing playlist and answers `202` with it; a caller who is
neither the owner nor a write collaborator answers not-found, so the route never confirms a playlist the caller
cannot write. The reconcile reads the source again from a stored, normalized source URL (new nullable
`source_url` column, migration `0003`) and leaves an associated video exactly as it is, appends a new one after
it, and reuses a track the instance already holds. A second run while one is in flight answers
`409 sync_already_running`, on the resync route and on a re-paste alike; a run left `running` by a crash is never
reclaimed, so its playlist answers `409` until something marks it failed. Ticket 01's create path now stores the
source URL and shares `beginRun` with the resync route.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
