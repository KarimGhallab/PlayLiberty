# 01: The row cannot tell a kept track from a lost one

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06 as decided: the row states two facts, one word each.

`trackStateLabel` is replaced by `trackStateFacts`, which returns `{ file, source }`. A stored track whose source was
removed yields `file: Retained`, a track that was never fetched yields `file: Never stored`, and both yield
`source: Removed from YouTube`. The catalogs gained `trackState.retained`, `retainedChip` and `unavailableChip`; the
`unavailable` word changed from "Unavailable" to "Never stored"; `removedFrom` remains the source fact. The chip key
`removedFromChip` was renamed to `retainedChip` because its meaning changed, and the empty sentences read "No track was
retained after a YouTube removal" and "No track was left without a copy" ("Aucune piste conservée après un retrait de
YouTube", "Aucune piste laissée sans copie").

The tone is split along the same axis: `fileTone` owns the file fact and gives `stored + removed` the new
`TrackTone.Retained` (the `tone-retained` token), while `trackTone` keeps the removed tone for the source fact. The
mobile chip's `'retained'` literal collapsed into the enum, so one mapping owns the colour.

Both clients draw the pair. The phone puts the file fact in its tone, a middot, then the source fact in the removed
tone; the web does the same in two spans. The gallery card's name and the detail's chips follow: "Retained 1" and
"Never stored 4", and the card's incomplete breakdown now says "Never stored" while still counting it as missing, which
[ticket 02](02-the-card-counts-what-cannot-be-recovered-as-missing.md) splits.

`docs/DESIGN.md` records the two-axis rule and the retained tone, `docs/GLOSSARY.md` records the two user-facing words
and the chip's plural, and the accepted ambiguity in
[issue 109](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md) is marked superseded. Issue
84's one-word rule still holds, now one word per axis.

Two i18n test files imported `../catalogs.js`, which does not exist; they had not been running. Both now import
`../catalogs/catalogs.js`, so the formatter suite executes.

Verified on the emulator against Chine: the retained view reads "Alaska / Retained · Removed from YouTube" in the pink
tone, the never-stored view reads four "[Deleted video] / Never stored · Removed from YouTube" rows in the unavailable
tone, and the row's accessible name is "Alaska, Retained, Removed from YouTube, 3:25". Screenshots are
`/tmp/opencode/t01/retained.png` and `/tmp/opencode/t01/never-stored.png`.
