# 12: The phone's design record and its first screen disagree

**Status:** resolved
**Labels:** `enhancement`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Needs the decision recorded, then the record or the app changes in one place.

## Observed

`docs/DESIGN.md` makes two claims about the library that the shipped app contradicts:

1. "The bulk sync keeps its count in the header; the web's phone arrangement drops it because the browser's header
   cannot hold the sentence, and the app's header can." The app has no bulk sync in the header; it is a row in the
   dial behind the accent control, with the count in its label.
2. "The add control is a labelled button in the header on the web and the floating round action on a phone, never
   both." The floating accent control opens a two-row dial; the add is an unaccented row inside it.

On 2026-11-03 the design direction was decided as **keep the shell, deepen the state**: the dial, the pill bar and the
sheets stand. That makes these two sentences the stale half.

## Expected

The record says what ships. One doc claim per decision: if the dial owns the add and the bulk sync, the mobile
section says so and stops describing a header control that does not exist.

## Evidence

- `docs/DESIGN.md`, "The settled arrangements", "The library is a gallery" and "The mobile client".
- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx`: the dial's actions and their labels.
- `apps/mobile/src/shared/components/ActionDial/ActionDial.tsx`: the two rows and the trigger.
- The 2026-11-03 screenshot of the dial open.

## Acceptance criteria

- [x] The applicable sentences in `docs/DESIGN.md` describe the dial as the owner of the add and the bulk sync, or
      the app is changed to match, and not both.
- [x] The accent's meaning is restated once for the phone, given that the accent control opens a menu there.
- [x] No other paragraph in the mobile section contradicts the result.
- [x] The "one owner per decision" rule still holds: the placement is stated in one place only.

## Outcome

The record now matches the dial. In "The library is a gallery", the add and the bulk sync are stated only for the
web, as the labelled header button and the count in that header; the phone sentence is gone. In "The mobile client",
the gallery paragraph says the add and the bulk sync are the two rows of the dial behind the floating accent control,
the add unaccented and the sync carrying its count in the label. That is the one place the phone placement is stated.

The accent rule now says the floating control that opens the dial keeps the fill and the dial's sync row alone is
accented, replacing the claim that a floating add kept it. The earlier line about what the library's accent marks was
changed from "the add" to "its primary control", so no paragraph still describes a header add or a header sync on the
phone. No other mobile-section sentence contradicts the dial.
