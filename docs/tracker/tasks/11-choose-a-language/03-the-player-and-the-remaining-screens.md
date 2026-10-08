# 03: The player and the remaining screens

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).
**Status:** resolved

## Outcome

Done. The player, the shared scaffolding and the remaining screens read through the catalog.

- The player bar reads its landmark and transport labels, the play/pause swap, and the seeker's label and its
  `{elapsed} of {duration}` value.
- The volume control reads the rail's label and the mute/unmute swap; the volume notice reads its level and
  muted sentences.
- The shared scaffolding: `EmptyState` (heading, prose, promise, sync verb), `ReadFailure` (retry and retrying),
  `UndoToast` (dismiss) and `PlaylistNotFound` (heading, prose, way home). `Dialog` and `NoticeToast` carry no
  copy of their own.
- The remaining surfaces: `PlaylistHeader` (share indicator, overflow items, play/pause, steps, shuffle and
  actions labels, shared-by line), `TrackBars` (playing/paused), `AddPlaylistDialog`, the library item's
  deferred delete, the library's replaced-action sentence, and `refusalNotice`, which now takes the translator
  for the shuffle refusal's two wordings.

The sync line, the state words, the counts and the sync summary/error remain for ticket 04; those are the only
production strings still outside the catalog.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (i18n 16, server 275, web 365). The player
and shared-component tests pass in `en` unchanged; their render helpers now wrap the provider, and
`refusalNotice`'s unit test passes an English translator. Not committed.
