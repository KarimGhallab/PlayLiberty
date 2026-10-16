# 01: Create a synced playlist and run its first sync

**Status:** resolved

## Outcome

`POST /playlists` validates the URL, creates the caller's Synced playlist and a run in `running`, and answers
`202` with the run; the reconcile finishes behind the response and a client reads it from the latest-run route.
It reads the source once through the adapter, creates one `pending` remote association per video in source
order, reuses a track the instance already holds, and writes the run's added count with the playlist's name,
cover, last-synced time and `idle` status in one transaction. Source uniqueness is now per owner (migration
`0002`), and `createTestContext` takes a substitutable adapter, with `fakeYoutube` the fake shared with the CSRF
suite.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
