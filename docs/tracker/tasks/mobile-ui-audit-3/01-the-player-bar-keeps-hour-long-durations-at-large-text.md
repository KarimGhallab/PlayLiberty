# 01: The player bar keeps hour-long durations at large text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)
**Blocked by:** None. Can start immediately.

## Observed

At font scale 2.0 a track longer than an hour draws its duration on two lines ("1:18" and ":56"). The second line falls
outside the 48dp seek row, is cut by the bar's overflow, and overlaps the gesture inset. Tracks under an hour fit.

## Expected

The duration stays on one line at 2.0 and the bar's published height still clears the gesture inset. The time slot
grows with the text, or the bar caps its text multiplier, or both.

## Evidence

- The emulator at font scale 2.0 with a 1:18:56 track: "1:18" on the first line and ":56" clipped below it.
- `apps/mobile/src/player/PlayerBar/SeekBar.tsx`: `styles.time` sets a fixed `width` of one `space-9`; `styles.row`
  fixes the height at `touchTarget`.

## Acceptance criteria

- [x] At 2.0 a one-hour-plus duration is fully readable on one line, or the row grows and the bar republishes its
      height.
- [x] The bar still clears the gesture inset, and the screens' bottom padding follows the new height.
- [x] 1.0 and 1.3 are unchanged.
- [x] A test renders the seek bar at 2.0 with an hour-long duration and asserts the duration is not clipped.

## Outcome

The time slots take a minimum width instead of a fixed one, and both time labels take one line. A one-hour-plus
duration grows its slot, the seek rail absorbs the difference, and the bar's height is unchanged, so the screens'
bottom padding and the gesture inset are untouched.

The new seek bar test renders a 1:18:56 track and asserts both time labels take one line. The emulator at 2.0 shows
the full "1:18:56" beside "0:04" with the bar clear of the gesture inset; 1.0 is unchanged.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass, and the
emulator at 2.0 shows the full duration.
