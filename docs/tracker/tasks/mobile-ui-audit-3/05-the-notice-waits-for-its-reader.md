# 05: The notice waits for its reader

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)
**Blocked by:** None. Can start immediately.

## Observed

A notice withdraws itself after four seconds. It has no visible dismiss control and no accessibility action; the swipe
is the only manual dismissal, and explore-by-touch intercepts it. A slow reader or a TalkBack user loses the message.

## Expected

The notice offers a close control, or the same `extend` accessibility action the undo snackbar has, and its timer pauses
while it holds accessibility focus.

## Evidence

- `apps/mobile/src/shared/components/Notice/Notice.tsx`: the four-second timer, the swipe-only dismissal, and no action.
- `apps/mobile/src/shared/components/UndoSnackbar/UndoSnackbar.tsx`: the `extend` action and the pause on touch.

## Acceptance criteria

- [x] A notice can be dismissed without the swipe, by touch and by a screen reader action.
- [x] The timer pauses while the notice has accessibility focus, or the action resets it.
- [x] The four-second default and the swipe still work.
- [x] A test asserts the action and the paused timer.

## Outcome

The notice body is the alert and carries the `extend` accessibility action; the action restarts the window, so a
reader asking for more time keeps the message. A visible close control is a sibling of the body, so TalkBack reaches
both, and it leaves with the same fade. The four-second default, the swipe and the live region are unchanged.

Tests cover the close, the default withdrawal and the reset window. The emulator's recording of an egress check shows
the notice with its close control, and the detail wraps under the message.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass, and the
emulator with TalkBack shows the action and the notice holding.
