# 03: Retain a track whose source video is gone

**Status:** resolved

## Outcome

The reconcile makes a second pass over the playlist's associations after it adds: a video the source no longer
lists has its track marked `sourceStatus: removed`. A stored track keeps its file and increments the run's
retained count, while a track with no file becomes `unavailable` and is not claimed by the download worker; the
flag is written to the track, so every playlist holding it reads the same answer, and `removedCount` stays zero.
Only the stored case counts as retained, since remote-removed is `stored` plus `removed` while an `unavailable`
track is a different state, so a track that left before it was downloaded adds nothing to the count. A video that
returns to the source does not clear the flag on a retained track, because the reconcile leaves an associated
video exactly as it is.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
