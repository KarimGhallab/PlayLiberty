# 10: The gallery's selected chip is clipped at rest

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The filter rail reveals a chip only once the user has chosen one (`chosen.current` is set on the first choice and every
reveal is guarded by it). So the rail opens at its start, and a selection restored from state sits off the right edge:
the first screen of the library shows "Toutes" cut in half with its count gone, and at 1.3 text scale the selected
status chip is off-screen while still focusable.

[`mobile-ui-audit-2/03`](../mobile-ui-audit-2/03-the-gallery-rail-reveals-its-selected-chip.md) added the reveal and is
resolved; this is the resting case it does not cover.

## Expected

A selection is brought fully into view whether it was chosen this session or restored, at 1.0 and at the capped text
scales. The rail's hidden side fades rather than cutting a word in half.

## Evidence

- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx`: `chosen` and the three guarded reveal paths.
- The 2026-11-03 screenshots, library at rest and at 1.3: the selected chip clipped, then gone.

## Acceptance criteria

- [x] On first paint with a restored non-default filter, the selected chip is fully visible.
- [x] The same holds at 1.3 text scale.
- [x] The initial reveal does not animate the rail on load.
- [x] The scope pair still leads the rail, and the status All still names tracks while the scope is drawn.
- [x] A test covers the restored selection.

## Outcome

The `chosen` guard is now a pair: a restored non-default status reveals on the first viewport, content or chip
measurement, and the reveal passes `animated: false` so the rail does not move on load. A chip the user taps still
reveals with the tween, or without it under reduced motion. The default selection keeps the old behaviour and leaves
the rail at its start, so a fresh library never scrolls the scope pair away.

The reveal still reads the measured chip rect and the measured rail, so a larger chip at 1.3 text scale lands in the
same path. The pair still leads the rail and the status All keeps its `allTracks` name while the scope is drawn.

Tests cover the restored chip at normal and enlarged widths, both asserting the exact offset with `animated: false`,
and the existing test still pins that the default leaves the rail alone until a chip is chosen.
