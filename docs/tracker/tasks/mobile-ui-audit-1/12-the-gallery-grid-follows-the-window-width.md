# 12: The gallery grid follows the window width

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The gallery always draws two columns: the column function divides the content box by two at every width. On an
unfolded foldable or a wide window each card is about 330pt, so covers become billboards and the grid shows one row per
screen. `supportsTablet: false` makes iPad a scaled phone.

## Expected

The column count follows the window: two below 600dp, three above. The skeleton, the pinned row and the card width use
the same rule.

## Evidence

- `apps/mobile/src/views/library/galleryColumns/galleryColumns.ts`: a fixed divide by two.
- `apps/mobile/src/views/library/GallerySkeleton/GallerySkeleton.tsx`: the same width.

## Acceptance criteria

- [ ] The column function returns 2 below 600dp and 3 above, with one named breakpoint.
- [ ] The grid, the skeleton and the pinned card width all read that function.
- [ ] A 320pt phone still keeps two usable columns.
- [ ] A unit test covers 390, 600 and 840.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The column test covers the three widths, and the emulator at 840dp shows three columns.
