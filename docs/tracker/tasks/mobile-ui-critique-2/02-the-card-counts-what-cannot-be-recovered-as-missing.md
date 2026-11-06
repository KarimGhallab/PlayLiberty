# 02: The card counts what cannot be recovered as missing

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** [`01`](01-the-row-cannot-tell-a-kept-track-from-a-lost-one.md). The terminal line and the card's name
must use the two-axis vocabulary settled there.

## Observed

The gallery card folds terminal `unavailable` tracks into the same missing count as pending, downloading and failed,
and draws them with a download glyph in the failure tone. On Chine all four are terminal, so a 94%-healthy playlist
carries a permanent download marker that can never resolve; it is the loudest line on the card after the cover.

The sync error band repeats the mistake with a stronger claim: its reassurance says "All {count} tracks are still
here" using the playlist's association count, on a playlist where four tracks were never stored.

## Expected

Two different facts, two different surfaces. An actionable shortage (pending, downloading, failed) keeps its download
words and its tone. A terminal absence (unavailable) is neutral, carries no download glyph, and says the tracks were
already gone and were not stored. The failure reassurance counts stored tracks, never associations, or drops "all".

## Evidence

- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx:91-102` and `:240-256`.
- `apps/mobile/src/views/playlist/SyncBand/SyncBand.tsx:79-86`, and `syncError.safe` in the English catalog.
- Screenshot `a-lib-01.png`: "4 tracks are not stored" under a download arrow, with "Up to date" beside it.
- Live data: Chine has 71 associations, 67 stored, 4 unavailable, 1 of them retained.

## Acceptance criteria

- [ ] A playlist with nothing pending shows no download marker and no warning tone.
- [ ] A playlist with pending work still says what is downloading and what failed.
- [ ] The terminal line names the fact without implying an action.
- [ ] The gallery card's accessibility name follows the same split.
- [ ] The failure reassurance is true on Chine: it counts 67, not 71, or does not claim "all".
- [ ] Both catalogs carry the new and changed copy.

## Verification

The library on the emulator shows Chine with no download glyph while it is up to date; a playlist with a pending track
still shows one. Force a sync failure and read the band against Chine's stored count. Then
`pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06. The card now counts two separate things.

`incompleteOf` folds pending, downloading and failed into a shortfall, which keeps the download glyph, the tone and the
`<count> tracks are not stored` words. `unavailable` becomes a terminal figure with its own muted line, no glyph and no
warning tone: `<count> tracks never stored`, both catalogs. The card's name carries whichever figures are present, so a
screen reader hears the same two facts the eye sees. The line states the state word rather than explaining it: the
reason is the row's "Removed from YouTube" (ticket 01), and the fuller sentence "never stored: their videos were already
gone" truncated to "already go..." at two lines on the 165dp card, so it was cut rather than elided.

The failure reassurance is now arithmetically true on both clients. The phone's band passes `counts[Stored]` and hides
the sentence at zero; the web's `SyncError` prop is renamed `trackCount` to `storedCount` so no caller can hand it the
association count by habit, and the detail page passes `counts[Stored]`. The web detail test moved from "All 3 tracks"
to "All 2 tracks", which is what the fixture actually holds.

The web gallery's `IncompleteBadge` carries the same policy and still folds terminal tracks into its download pill. That
is [ticket 19](19-the-web-card-still-counts-terminal-tracks-as-downloading.md), split out rather than redesigned here
because the web card's mark is a different component with its own hover tip.

Verified on the emulator against Chine: the card reads `71 tracks · Up to date` and `4 tracks never stored` in the muted
role, with no download arrow and no failure tone (screenshot `/tmp/opencode/t01/card3.png`). A playlist with a shortfall
keeps the arrow through the unit test. The sync-failure band was not forced on the device, which would need the source
to fail; its count is covered by the mobile and web suites.

Checks: mobile 634, web 632, and the package suites; `pnpm run build` and `pnpm run lint:check` clean.
