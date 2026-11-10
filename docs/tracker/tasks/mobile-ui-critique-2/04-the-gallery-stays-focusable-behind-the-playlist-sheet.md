# 04: The gallery stays focusable behind the playlist sheet

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06, with the on-device screen-reader check left to a human for the reason recorded below.

`apps/mobile/src/shared/a11y/useCoveredScreen.ts` follows the route's focus: the callback clears the flag on focus and
sets it on blur. `Screen` now takes a `covered` prop and maps it to `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"` on the frame, so `LibraryShell` leaves the accessibility tree while
the playlist route is presented and returns on pop. The gallery stays mounted, so the sheet's pull-down still reveals
it and nothing moves visually. `PlayerBar` is rendered outside the `Stack` in `app/_layout.tsx`, so the transport is
untouched and reachable.

`LibraryShell.test.tsx` renders the shell with a focus-effect probe, fires the blur cleanup and asserts the frame
flips from `auto` to `no-hide-descendants` while the gallery body remains mounted.

The dump criterion cannot be met by `uiautomator` on this build, and this is a tool limit, not a failed hide. Its
accessibility service requests `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`, so it lists views that TalkBack would skip. As a
control, the same `importantForAccessibility="no-hide-descendants"` applied to the detail's own frame still left 607
nodes in the dump, unchanged. The earlier `d3.xml` dump that shows both screens was therefore the same artefact. The
real oracle is TalkBack, which needs a human, as with [ticket 11](11-the-cards-overlaid-controls-are-still-clickable-nodes.md);
the focus-restoration criterion needs the same session.

The root build, lint and unit run follows in the batch for this session.
