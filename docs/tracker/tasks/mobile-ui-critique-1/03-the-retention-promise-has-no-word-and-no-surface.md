# 03: The retention promise has no word and no surface

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The card's meta is now two rows: the count and the sync state on the first, and, when anything is missing, the icon
with `library.notDownloaded` as a sentence ("4 tracks are not stored", "4 pistes ne sont pas stockées"). The bare
number is gone, and `cardLabel` carries the same sentence after the count.

The retention figure needed a server fact the five buckets cannot express, so `PlaylistTracksPageSchema` gained
`remoteRemoved`: a count of `fileStatus: stored` plus `sourceStatus: removed`, computed by
`remoteRemovedCount` in `playlistService` and returned beside `counts`, never inside them. The buckets still sum to
the playlist's size, and a source removed before anything was stored stays in the Unavailable bucket.

It is drawn in the actions sheet's summary, under the run stamp and cells, as
`syncSummary.retained` ("1 track removed from YouTube is still stored"). That is the surface the design already gives
the sync evidence ("the run band above the actions and the checkbox below them, so the page itself keeps only the
header's sync line"), and it is the honest home: the identity block has a fixed height at two states and text capped at
1.3, so a fifth line there would overflow the compact header. The figure describes the playlist, not the last run, so
it survives a run that changed nothing. Verified on the emulator: "Aucun changement" and "1 piste retirée de YouTube
est toujours stockée" read together, which is the distinction the ticket asked for.

Tests: two on the band (the figure and its absence at zero), the card's word and name, and the server's count, which
also pins that the five buckets still sum to the playlist's size.

The web client draws the same figure from the same field and the same key: `SyncSummary` takes `remoteRemoved` and the
playlist's provider and prints `syncSummary.retained` under the run's counts, so both clients report retention once.
