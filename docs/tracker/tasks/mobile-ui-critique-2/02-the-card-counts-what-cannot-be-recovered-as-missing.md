# 02: The card counts what cannot be recovered as missing

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

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
