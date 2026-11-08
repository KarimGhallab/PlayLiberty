# 07: A track title is one line

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The title takes two lines at every scale, so the 1.3 threshold that used to buy the second
line is gone: `numberOfLines={2}` is unconditional and `PixelRatio` no longer enters the row.

The row has no fixed height, so it grows with the second line and the FlatList measures the new height; the list's
bottom padding still clears the dial and the player bar. The artwork, duration and lane keep `alignItems: 'center'`, so
they centre on the two-line row rather than on the first line.

Verified on the emulator at 1.0 (`/tmp/opencode/t06/compact-1.0-after2.png`) and 2.0: the two Makafushigi rows read
"Makafushigi Adventure (F..." and "Makafushigi Adventure Ins...", each on two lines, with the durations and lane doors
centred.

`TrackRow.test.tsx` asserts the two-line default; the two scale-dependent tests it replaces are gone.

The root build, lint and unit run follows in the batch for this session.
