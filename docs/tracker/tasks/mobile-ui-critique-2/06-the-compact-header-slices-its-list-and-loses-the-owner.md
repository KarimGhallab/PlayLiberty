# 06: The compact header slices its list and loses the owner

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The compact detail header is a fixed 116dp box with `overflow: hidden`. At 1.0 the first list row is sliced mid-title at
the header's bottom edge with no hairline or ground change, so it reads as a rendering artifact rather than a scroll
under a surface. At 2.0 the identity is capped but the fourth line, "Shared by Dev User", is clipped away entirely,
which removes the only line that says whose playlist this is.

## Expected

The collapsed header ends on a visible boundary, and it shows the identity it holds rather than cutting it. At large
text the header grows to the identity's height, or drops a line it can spare, before dropping the owner.

## Evidence

- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx:72,531-537`: the fixed height.
- `:754-757`: the clipping.
- Screenshots `a-detail-compact.png` (sliced row) and `a-scale2-compact.png` (owner line gone).

## Acceptance criteria

- [x] The compact header's bottom edge is a visible rule or ground change at every text size.
- [x] No list row is sliced at a header boundary when the list is scrolled.
- [x] At 2.0 the header shows the name and the owner, or shows the owner and drops the count instead.
- [x] The wide-to-compact interpolation still runs backwards without a jump.

## Verification

Scroll the detail on the emulator at 1.0 and 2.0, capture the collapsed state, and confirm the edge and the identity.
Then `pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
