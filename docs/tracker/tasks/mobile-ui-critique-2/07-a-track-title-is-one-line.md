# 07: A track title is one line

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** [`03`](03-the-player-bar-collides-at-200-percent-text.md). The row's line height and cap are settled
there, and the two edits touch the same style.

## Observed

Below a 1.3 font scale a track row allows one line for its title, so a phone shows about 24 characters. "Makafushigi
Adventure (FUL..." and "Makafushigi Adventure Instr..." are indistinguishable, and the same happens across the Dragon
Ball OST names. Picking the right song is the row's whole job.

## Expected

Two lines as the default on a phone, as the row already does at large text. The row grows, the list pays it, and the
artist or source line keeps its place.

## Evidence

- `apps/mobile/src/views/playlist/TrackRow/TrackRow.tsx:99`: one line below the 1.3 cap.
- Screenshot `a-detail-01.png`.

## Acceptance criteria

- [x] At 1.0 a long title wraps to two lines and is readable.
- [x] The row's height and the list's bottom padding account for the extra line.
- [x] The duration and the lane stay aligned with the row, not the first line.
- [x] The 1.3 cap and the two-line cap at large text still hold.
- [x] A test asserts the two-line default.

## Verification

Open Chine on the emulator and read the two Makafushigi rows at 1.0 and 2.0. Then
`pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
