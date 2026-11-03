# 07: Four motion paths ignore reduced motion

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

`useReduceMotion` is honoured by 15 of the 19 animation paths. Four still run:

1. `PlayerBar.tsx`, `settleBack`: an `Animated.spring` when a swipe does not commit.
2. `Notice.tsx`: two settle-back springs, one for each direction.
3. `PlaylistDetail.tsx`, `followHeader`: a `requestAnimationFrame` lerp that chases the scroll offset on every scroll,
   so the header animates its own geometry for several frames regardless of the system setting.
4. `app/_layout.tsx`: only the playlist route sets `animation: reduceMotion ? 'none' : ...`; the track, egress,
   provision and callback routes keep the stack defaults.

## Expected

`docs/PRODUCT.md`, Accessibility and inclusion: the mobile client reads reduced motion from the system.
`docs/DESIGN.md`, "Rules the design keeps": reduced motion has one owner, and a component adds a still alternative
only for motion that carried meaning. A collapsed header that follows a scroll is motion; under reduced motion it
tracks the offset without the tween, or snaps.

## Evidence

- `apps/mobile/src/shared/a11y/useReduceMotion.ts`: the reader and its 19 consumers.
- The four sites above, each with no `reduceMotion` read.

## Acceptance criteria

- [x] Each of the four reads `useReduceMotion` and takes its still form: the springs jump to the resting value, the
      header follows without a lerp, and every pushed route keeps its no-animation setting.
- [x] With the system toggle on, a drag that aborts settles instantly and the detail header tracks the scroll.
- [x] With it off, nothing changes.
- [x] No component restates the global rule; only these paths contribute their still alternative.
- [x] Tests cover the still branch of at least the header and the bar.

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
