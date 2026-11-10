# 19: The web card still counts terminal tracks as downloading

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The badge counts only the shortfall.

`MISSING` is pending, downloading and failed; `SEVERITY` drops `unavailable` and the tone is undefined when no
shortfall exists, so the pill is not drawn at all on a terminal-only playlist. Its count, its tone, its breakdown tip
and its accessible name therefore describe work that can still finish. The terminal figure is a separate muted line
with no icon and no pill, in the never-stored words: `Jamais stockées 4`, `Never stored 4`. When both exist, the count
line carries the pill and the line.

No hover-only information moved. The pill's tip still lists its own breakdown, and the terminal figure is visible text,
not a tip.

Verified in the browser on the dev client: Chine (67 stored, 4 unavailable) reads `71 pistes · À jour` and
`Jamais stockées 4` in the muted role, with no download glyph. The combined case is covered by the unit test with
pending 2, downloading 1, failed 3 and unavailable 5: the pill reads 6 and names `6 tracks are not stored · Pending 2 ·
Downloading 1 · Failed 3`, while the line reads `Never stored 5`.
