# 06: Recover an interrupted download and stop cleanly

**Status:** resolved

## Outcome

The startup sweep empties the temporary directory and returns `downloading` rows to `pending`, leaving a stored
track and its file alone and an interrupted download with no stored file. The worker tracks the pass in flight,
and `stop()` clears the interval so no new pass starts and then waits for that pass; because a download is not
abortable, a clean stop lets it finish rather than closing the database under it, and `buildApp` awaits the stop
in its close hook. A hard kill still leaves only a temporary file, which the sweep reclaims on the next boot. The
worker takes the database, the media paths, the adapter, the concurrency and an optional interval rather than the
whole context, and the default interval stays thirty seconds.

See [`02-store-a-track.md`](../../specs/02-store-a-track.md).
