# 08: The floating add covers the row's lane

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The detail's floating add sits at the bottom right, directly over the lane column, so the row beneath it loses its
"..." door until the list scrolls. The row's only secondary action is the one the add covers.

## Expected

The add never parks over a row's control. Either it leaves the lane column clear, or it withdraws on scroll and returns
at rest, or it moves into the header where the recurring actions already live.

## Evidence

- Screenshot `a-detail-compact.png`: the plus covers the lane of the row beneath it.
- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx:1432-1459`.

## Acceptance criteria

- [x] No row's lane control is covered by the add at rest.
- [x] The add stays reachable with a thumb.
- [x] The player bar's height is still respected.
- [x] Reduced motion keeps the chosen behaviour without a tween.

## Verification

Scroll the detail on the emulator and press two different lane doors under the add's resting position. Then
`pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
