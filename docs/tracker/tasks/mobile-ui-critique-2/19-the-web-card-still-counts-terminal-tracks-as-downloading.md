# 19: The web card still counts terminal tracks as downloading

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** [`02`](02-the-card-counts-what-cannot-be-recovered-as-missing.md). The split is settled there; this is the
same policy on the other client.

## Observed

The web gallery's incomplete badge folds `unavailable` into the same count as pending, downloading and failed, and
draws it with a download icon in the failure tone. A playlist with 67 stored tracks and 4 whose video was gone before
storage therefore carries a permanent "4" download marker that can never resolve. The badge's accessible name lists
"Never stored 4" inside a sentence that begins "4 tracks are not stored".

## Expected

The badge counts only what can still finish. A terminal absence is neutral, carries no download glyph, and says the
tracks were never stored. When both exist, both facts are shown.

## Evidence

- `apps/web/src/views/library/IncompleteBadge/IncompleteBadge.tsx`: `MISSING` includes `TrackFileStatus.Unavailable`,
  and the icon and the badge's tone do not distinguish it from a download.
- Its test asserts that eleven of sixteen are missing across pending, downloading, failed and unavailable.
- The mobile card was split by [ticket 02](02-the-card-counts-what-cannot-be-recovered-as-missing.md); the web was not.

## Acceptance criteria

- [ ] A playlist with nothing pending shows no download marker and no failure tone.
- [ ] A playlist with pending work still shows the count and its breakdown.
- [ ] The terminal count takes the muted role, no icon, and the never-stored words.
- [ ] When both exist, the badge and the terminal line are both reachable.
- [ ] The badge's accessible name follows the same split.
- [ ] No hover-only information is lost.

## Verification

Render a card with `stored: 67, unavailable: 4` and confirm no download marker; render `pending: 1, failed: 2,
unavailable: 4` and confirm both facts. Then `pnpm --filter @playliberty/web test`.

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

Checks: web 633, mobile 634, and the package and server suites; `pnpm run build` and `pnpm run lint:check` clean.
