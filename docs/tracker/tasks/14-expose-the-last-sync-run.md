# Expose the last sync run

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`GET /api/v1/playlists/:id/sync-runs/latest` returns the latest run, with `playlist_not_found` and `sync_run_absent` separated by problem code at one status. Registered in `apps/server/src/app/buildApp.ts`, service in `features/sync/syncRunService.ts`, ten route tests. A playlist the account cannot see answers `404` rather than `403`, the deliberate divergence from the stream route.

See [`01-sync-a-playlist`](../specs/01-sync-a-playlist.md).
