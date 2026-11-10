# 05: Every control meets the 44pt target

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The six controls take 44 points without changing what they paint. The seek rail and its row grew from 32 to 44, and the
knob centres explicitly on the rail, so the track stays 3pt; the bar's bottom row grows by 12, which the published
height from ticket 02 carries to the screens' padding. The two disclosure links and the two retries take a 44pt
`minHeight` with their text centred; the scope segments keep their 38pt drawn box and take 3pt of `hitSlop` above and
below, the pair's 2pt padding and 1pt border making up the rest.

Each target is asserted in its component's suite: the rail's height, the two links' and retries' `minHeight`, and the
scope's `hitSlop`. The emulator shows the taller seek row and the unchanged painted track.
