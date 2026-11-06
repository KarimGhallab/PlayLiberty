# 12: The player bar names nothing about the queue

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The bar's artwork button is announced as "Open Chine" while the visible line beside it reads "Chine 31/67", so the
queue position a sighted user reads is missing from the name. The play/pause orb sets `selected` for a toggle, so the
announcement is "Pause <title>, selected" rather than a pressed state.

## Expected

The name carries the visible facts, including the position. A play/pause control reports a pressed state, not a
selection.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx:366-368`: the label.
- `PlaylistIdentity`-style meta at `:313-329` draws the position.
- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx:285`: `accessibilityState={{ selected: isPlaying }}`.

## Acceptance criteria

- [x] The artwork button's name includes the playlist and the queue position.
- [x] The orb reports `checked` or `expanded` semantics that match a toggle, or drops the state and relies on its
      changing label.
- [x] No visible text is missing from a name on this bar.
- [x] The names are built from one template per control, not string concatenation.

## Verification

Dump the player bar's nodes at 1.0 and read the names; they match the visible line. Then
`pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06. The door and the orb were changed together.

`playerBar.openPlaylist` is one template now, `Open {name}, {position}` (French `Ouvrir {name}, {position}`), and the
identity button passes the playing playlist's name and its visible `queueLabel`. The orb's `selected` state is gone;
the label already flips between `Play {title}` and `Pause {title}`, so removing the state leaves a truthful control.
The title is named by the orb, the playlist and position by the door, and the elapsed and total times by the seek
rail's value.

Verified from the 1.0 hierarchy: the door reads `Open Chine, 8/67`, the orb `Play Dragon ball soundtrack 2`, and the
rail `Position in track, 1:03 of 3:43`. `PlayerBar.test.tsx` asserts the door label and that the orb carries neither
`selected` nor `checked`; the French names test moved to `Ouvrir Rain On The Window, 1/1`.

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
