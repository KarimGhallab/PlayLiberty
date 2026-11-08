# 07: Four motion paths ignore reduced motion

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The four paths now read the shared setting and keep their still form.

- `PlayerBar`'s `settleBack` sets the deck to zero and drops the incoming page immediately instead of springing it.
- `Notice`'s two settle-back springs, on a refused swipe and on a terminated gesture, set the offset to zero.
- `PlaylistDetail`'s `followHeader` writes the scroll's target straight into `headerProgress` instead of starting the
  `requestAnimationFrame` lerp, so the header tracks the offset on the event itself.
- `app/_layout.tsx` sets `animation: 'none'` in the stack's `screenOptions` when the setting is on, so the track,
  egress, provision and callback routes stop sliding too; the playlist's transparent modal keeps its own override
  because its allowed-motion animation is `slide_from_bottom`, not the platform default.

With the setting off, every branch falls through to the existing motion. The only rule stated at the navigator is the
global one; no screen re-states it.

Tests: the header schedules no animation frame on a scroll under reduced motion, and the bar calls no spring on a
refused swipe and leaves its deck at zero. The app also ran on the emulator with the system toggle on and no
regression.
