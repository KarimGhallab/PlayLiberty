# 06: The compact header slices its list and loses the owner

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The header's compact height now follows its capped identity instead of a fixed box.

`narrowHeaderHeightFor(scale)` sums the four compact lines (name, the meta row with its 24dp sync control, count, owner),
their gaps and the top inset, then takes the larger of that and the 126dp cover box. `useNarrowHeaderHeight` applies the
identity's 1.3 cap, so the target is 126dp at 1.0 and about 143dp at 2.0. `PlaylistIdentity` uses it for the animated
height and for the actions' travel; `PlaylistDetail` uses it for the sheet's pull boundary, so the two share one value.
The count and owner each take one line, which keeps the four-line sum exact on a narrow phone too (an ellipsis, never a
wrap that the height does not know about).

The compact edge is a 1dp `line` rule at the frame's bottom, faded in with the collapse, so a row cut by the list's
viewport sits under a surface with a marked floor instead of ending in mid-air.

Verified on the emulator at 1.0 and 2.0 (`/tmp/opencode/t06/compact-1.0-after2.png`, `compact-2.0-after.png`): all four
lines show, the rule marks the edge, and the wide header returns on the way up with the same target the way down used.
At 2.0 the fourth line, "Shared by Dev User", is visible; before the fix it was clipped (`compact-2.0-before.png`).

`PlaylistIdentity.test.tsx` pins the 126dp base and asserts the growth at the cap.

The root build, lint and unit run follows in the batch for this session.
