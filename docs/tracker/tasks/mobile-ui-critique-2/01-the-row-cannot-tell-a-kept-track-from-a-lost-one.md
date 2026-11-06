# 01: The row cannot tell a kept track from a lost one

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

A track whose source was removed reads "Removed from YouTube" whether its file was stored or was never obtained. The
retained chip, added on 2026-11-03, reuses the same words: the view that proves retention and the view that lists losses
are named identically. Filtering to the retained view shows "Alaska / Removed from YouTube"; filtering to Unavailable
shows four "[Deleted video] / Removed from YouTube" rows in the same grammar. The only difference is the chip count
above them.

## Expected

The row states two facts, each with one word: what the file is, and what the source is. A kept track says it is still
stored and that its source was removed. A lost track says it was never stored and that its source was removed. The
retained chip names survival, not removal. "One word per track state" ([issue 84](../../issues/84-one-word-per-track-state.md))
still holds, now one word per axis rather than one word per row.

## Evidence

- `packages/i18n/src/formatters/formatters.ts:110-124`: the source status is checked before the file status and returns
  one sentence for both cases.
- `packages/i18n/src/en.ts:450-459`: `removedFrom` and `removedFromChip` are the same string.
- `docs/DESIGN.md`, "Track states": the rule that a removed source takes the removed word whatever the file says. The
  user has decided this rule changes.
- Screenshots `a-detail-removed-filter.png` and `a-detail-unavailable.png` in `/tmp/opencode/critique-mobile2/`.
- [Issue 109](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md) records the ambiguity as
  accepted; this ticket supersedes that paragraph.

## Acceptance criteria

- [ ] A kept track and a lost track never share their state sentence.
- [ ] Both still report the source fact, so a removal is never silent.
- [ ] The retained chip's word names survival and differs from the row's source fact.
- [ ] No state is carried by colour alone, and every state keeps a word.
- [ ] `docs/DESIGN.md` and `docs/GLOSSARY.md` record the two axes, and issue 109's accepted ambiguity is marked
      superseded.
- [ ] English and French move together, with plural forms for the chip and the row.

## Verification

Filter Chine to Removed from YouTube and then to Unavailable on the emulator: the two rows no longer read alike. Then
`pnpm --filter @playliberty/i18n test`, `pnpm --filter @playliberty/mobile test`, and screenshots of both filters at
`font_scale` 1.0 and 1.3.

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

Checks: i18n 46, ui-foundation 24, mobile 632, web 632; `pnpm run build` and `pnpm run lint:check` clean.
