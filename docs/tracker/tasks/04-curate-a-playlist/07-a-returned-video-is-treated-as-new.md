# 07: A returned video is treated as new

**Status:** resolved

## Outcome

Implemented and verified. The reconcile now reads the source's present video ids once, lifts the playlist's suppressions whose video is not among them, and reuses that set for the retention pass it already ran; `liftAbsentSuppressions` reads the playlist's own suppressions and deletes the absent ones in one `in` statement, so the work is bounded by the suppression count rather than by the size of the source. A suppressed video the source still lists is left alone, so a removal stays in force while the video is present, and an absent one is lifted, so a video that returns is associated again; this overrides spec 01 ticket 04's criterion that the reconcile never writes a suppression, and that ticket is annotated. A returned video is associated but its track row is not un-marked: `sourceStatus` stays `removed` if a sync had seen it absent while it was associated, a track that is `unavailable` stays unavailable rather than being re-queued, and a video that leaves and returns entirely between two syncs is never re-added. The three new tests cover the lift after a real removal through the association service, the leave-and-return round trip that ends in a re-association, and a removal holding while the source still lists the video.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
