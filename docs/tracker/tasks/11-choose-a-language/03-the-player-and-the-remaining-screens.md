# 03: The player and the remaining screens

**Status:** resolved

## Outcome

The player, the shared scaffolding and the remaining screens read through the catalog. The player bar reads its landmark and transport labels, the play/pause swap, and the seeker's label and its `{elapsed} of {duration}` value, and the volume control reads the rail's label, the mute/unmute swap, and the volume notice's level and muted sentences. The shared scaffolding is `EmptyState` (heading, prose, promise, sync verb), `ReadFailure` (retry and retrying), `UndoToast` (dismiss) and `PlaylistNotFound` (heading, prose, way home); `Dialog` and `NoticeToast` carry no copy of their own. The remaining surfaces are `PlaylistHeader` (share indicator, overflow items, play/pause, steps, shuffle and actions labels, shared-by line), `TrackBars` (playing/paused), `AddPlaylistDialog`, the library item's deferred delete, the library's replaced-action sentence, and `refusalNotice`, which now takes the translator for the shuffle refusal's two wordings; the sync line, the state words, the counts and the sync summary/error remain for ticket 04.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
