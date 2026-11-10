# 10: The gallery's selected chip is clipped at rest

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The `chosen` guard is now a pair: a restored non-default status reveals on the first viewport, content or chip
measurement, and the reveal passes `animated: false` so the rail does not move on load. A chip the user taps still
reveals with the tween, or without it under reduced motion. The default selection keeps the old behaviour and leaves
the rail at its start, so a fresh library never scrolls the scope pair away.

The reveal still reads the measured chip rect and the measured rail, so a larger chip at 1.3 text scale lands in the
same path. The pair still leads the rail and the status All keeps its `allTracks` name while the scope is drawn.

Tests cover the restored chip at normal and enlarged widths, both asserting the exact offset with `animated: false`,
and the existing test still pins that the default leaves the rail alone until a chip is chosen.
