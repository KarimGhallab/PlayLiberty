# 08: The floating add covers the row's lane

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The add now leaves the lane column clear.

`PlaylistDetail` gives the dial `DIAL_RIGHT`, the content inset plus the lane's 48dp plus an 8dp gap, so the trigger's
right edge stops before the lane's left edge. On the emulator at 2.0 the trigger is `[744,1777][891,1924]` and the lane
column is `[912,963][1038,1089]`, a 21px (8dp) gap; the trigger still sits in the thumb's right half, and `bottomOffset`
is unchanged, so the player bar's height is still respected. The dial's reveal was already gated by `useReduceMotion`,
which sets its value without a tween.

Verified by pressing the lane door of "Dragon Ball OST - Milk Delivery" at the add's own vertical band: the track
actions sheet opened (`/tmp/opencode/t08/lane-under-add.png`).

`PlaylistDetail.test.tsx` now pins the dial's `right` alongside its `bottom`.

The root build, lint and unit run follows in the batch for this session.
