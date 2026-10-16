# 05: A failed sync changes nothing

**Status:** resolved

## Outcome

Verified with no production change: the failure branch shipped with ticket 01. The reconcile reads the source
first, and if that read throws, the catch marks the run `failed` with the adapter's message, sets `finishedAt`,
and moves the playlist to `error` with a last-synced time. Because the read is the first thing the reconcile
does, a failure creates no association, marks no track remote-removed and moves no position before it throws. A
failure is distinct from an empty but successful reading: the empty source retires the track while the failure
leaves it alone.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
