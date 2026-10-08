# 04: The track list and the player bar

**Blocked by:** [`01`](01-build-the-queue-and-play-it.md), [`02`](02-the-audio-element-and-the-browser-controls.md), [`03`](03-skip-what-cannot-be-played.md).
**Status:** resolved

## Outcome

The detail page's list is now `TrackRow`, and the bar is the design's two-row arrangement. The queue's surface
and the queue itself are one object: the row a listener presses is `toPlayerTracks(...)`'s entry, and the row's
control is present exactly when the entry survives that filter, which is the same test the queue applies. The
control is absent for a non-stored track and its 28px lane stays reserved, so durations stay in one column
whether or not a track can play. A stored track whose source was removed still plays, because playability is
`fileStatus === stored` and the source is only a way to have got there.

The bar is absent at rest and appears on the first track, then persists: `PlayerBar` and `PlayerAudio` are
siblings of the router outlet, so a route change re-renders the outlet and leaves both mounted, which a memory
router drives in `router.test.tsx`. It draws both rows the design asks for, the identity with the playlist name
under the title, the centred transport, and the 480px seeker with its two times. Its morph is one shared
`PlayGlyph` strip whose resting frame is driven by `data-state` on the host, so the row and the bar show the
same control in the same two poses.

The last criterion, a real seek, is checked two ways. It is automated in `e2e/tests/playback.spec.ts`: the fake
adapter copies the committed silent M4A and now reports its real two-second length, so the element plays a real
file in Chromium; the test presses play, waits for `currentTime` to pass 0.8s, pauses, seeks back through the
seeker, and asserts the playhead dropped. And it was checked by hand against the running dev server on the
`Test` playlist: pressing a row started playback, and a click at a quarter of the seeker moved the playhead
from 69.7s to 1:08 of 4:35, with the fill, the knob and the elapsed time all reading the same number. The bar
measured 97px against the design's stated 98, which is line-box rounding, not a missing declaration: the
specimen sets no fixed height and 98 is its measured sum.

One deliberate difference from the design record: the bar's boundary is a top border in `--line` rather than a
shadow, because a dark blur over a dark page is invisible rather than subtle, which the specimen's own comment
already argues.
