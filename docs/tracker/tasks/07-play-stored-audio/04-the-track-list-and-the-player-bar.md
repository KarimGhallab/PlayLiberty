# 04: The track list and the player bar

**Status:** resolved

## Outcome

The detail page's list is `TrackRow`, and the row a listener presses is the `toPlayerTracks(...)` entry whose control is present exactly when the entry survives that filter, with the 28px lane reserved for a non-stored track so durations stay in one column. `PlayerBar` and `PlayerAudio` are siblings of the router outlet, so the bar is absent at rest, appears on the first track and stays mounted across route changes. It draws the identity with the playlist name under the title, the centred transport, the 480px seeker with its two times, and one shared `PlayGlyph` strip whose resting frame is driven by `data-state` on the host. A real seek is covered in `e2e/tests/playback.spec.ts` against the committed silent M4A and checked by hand on the `Test` playlist, where a quarter-seeker click moved the playhead from 69.7s to 1:08 of 4:35; the bar measures 97px against the stated 98 (line-box rounding) and its boundary is a top border in `--line` rather than a shadow.

See [`07-play-stored-audio`](../../specs/07-play-stored-audio.md).
