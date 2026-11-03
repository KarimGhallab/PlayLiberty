# 03: The gallery rail reveals its selected status chip

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

With a shared playlist, the scope pair and the status chips share one horizontal rail. On first paint the selected
status chip is cut at the right edge: only "Toutes" and part of its count are visible, while its accessible label is
"Toutes les pistes 1275". The user has to scroll the rail blind to read the default filter.

## Expected

The rail keeps its start on first load, so the scope pair stays visible. A status chip the user picks is scrolled
fully into view, with its count. The detail already does this with `revealChip`.

## Evidence

- The gallery screenshot at font scale 1.0: the selected chip is cut at the right edge.
- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx`: the rail and the chips.
- `apps/mobile/src/views/playlist/PlaylistControls/PlaylistControls.tsx`: `revealChip` is the model.

## Acceptance criteria

- [x] The rail stays at its start on mount, with the scope pair and the start of the chips visible.
- [x] A chip the user picks is fully inside the viewport.
- [x] The scope pair and the status chips still share one rail, or the split is deliberate.
- [x] The reveal respects reduced motion.
- [x] A test asserts the scroll offset or the chip's visibility.

## Outcome

The gallery rail now carries the detail's reveal, gated on a chip press. It measures its viewport, the chips' left
edge and each chip's box, and scrolls the picked chip inside a 12pt margin when it is past either edge, without
animation when reduced motion is on. The rail does not move on its own: the first load keeps the scope pair in view,
and once a chip has been picked, a later layout or content resize keeps that chip in view.

The scope pair and the status chips still share one rail. The gallery test fires the rail's layout, the chips' offset
and the chip boxes, asserts the rail is still at its start, then presses a chip and asserts the computed offset. On
the emulator the gallery opens on the scope pair, and tapping the clipped "Toutes les pistes" chip scrolls it fully
into view.

## Verification

`pnpm --filter @playliberty/mobile run test` and typecheck pass. The emulator shows "Toutes les pistes" and its count
without a scroll.
