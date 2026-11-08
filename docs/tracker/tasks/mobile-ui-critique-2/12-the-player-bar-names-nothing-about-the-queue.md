# 12: The player bar names nothing about the queue

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

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

The root build, lint and unit run follows in the batch for this session.
