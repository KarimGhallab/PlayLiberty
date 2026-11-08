# 01: The player bar keeps hour-long durations at large text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)

## Outcome

The time slots take a minimum width instead of a fixed one, and both time labels take one line. A one-hour-plus
duration grows its slot, the seek rail absorbs the difference, and the bar's height is unchanged, so the screens'
bottom padding and the gesture inset are untouched.

The new seek bar test renders a 1:18:56 track and asserts both time labels take one line. The emulator at 2.0 shows
the full "1:18:56" beside "0:04" with the bar clear of the gesture inset; 1.0 is unchanged.
