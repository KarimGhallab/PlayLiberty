# 07: Share the track-state vocabulary

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/ui-foundation` owns the vocabulary: `TRACK_STATUS_CHIPS` for the five file states, `RETAINED_CHIP` and `STATUS_CHIPS` for the rails, `statusCount`, `totalStatusCount`, `visibleStatusChips`, and the stream verdict (`StreamFailureKind`, `isGoneStreamStatus`, `streamFailureKind`) whose gone set is `403`, `404` and `409`.

`@playliberty/i18n` owns `failureSentence` and the track-link notices (`cannotPlayNotice`, `unknownTrackNotice`, `leftPlaylistNotice`). The app copies and their tests are deleted.

Web builds its rail from the shared table and maps `TrackTone` to its own `ChipTone` classes. Mobile rails import the shared table and helpers. Mobile's stream classifier now drops a `403` and a `409` as web does; web keeps its probe and both call the shared verdict.
