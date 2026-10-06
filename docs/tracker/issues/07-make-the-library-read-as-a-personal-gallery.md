# 07: Make the library read as a personal gallery

**State:** `resolved`
**Category:** `enhancement`

## Grilling

Settled so far:

- **Q2, the playing mark:** the equalizer strip on the playing row's cover. A state, not a control, so it
  marks what is playing without implying the row is a transport.
- **Q3, the empty gallery:** one invitation. Suppress the header's Add on the empty state so the gallery's
  framed action is the only one, and re-balance the empty state off the top.
- **Q4, scope:** 07 owns the identity, the playing mark, the empty state and the count line. The shuffle's
  form and the cover's durability are not 07's (issues 02 and 05).
- **Q5, the identity move:** dropped. The layout is kept and the item is untouched, so the sync line is not
  raised and retention stays in the empty state's copy.
- **Q6, the count line:** kept on its own line. No change.
- **Q7, the cover-derived ambience:** every row's ground is its own cover, blurred, fading from full
  strength on the leading edge to nothing across the row. On hover or focus the row keeps its colour and
  lightens. The ground is per row, not per page.
- **Q8, the row's ground:** the cover reused, blurred (variant E), chosen over a computed tone.
- **Q9, a computed tone:** not needed. Dropped with the choice of E, so there is no extraction and no
  `coverTone` field.
- **Q10, the fallback:** a no-cover playlist takes the existing `sleeveIndex` hue, so the sleeve and the
  row's ground are one system.

- **Q11, how the cover becomes the ground:** the small derivative stored beside the cover at fetch time,
  served as `?size=small`, so no filter runs per row and it ports to mobile. Issue 10 builds it.
- **Q12, the playing mark against the coloured ground:** the equalizer strip stays the playing mark, and it
  is the same music-bars animation a playing track row draws, so "playing" reads the same on both screens.

## Outcome

Implemented. The library's rows draw their cover as a blurred ground: the small derivative behind the
content, full strength at the leading edge and gone across the row, lightening on hover or focus; a
no-cover row takes the sleeve hue. The playing playlist is marked with the same `TrackBars` equalizer a
playing track row draws. The empty state offers one invitation: the header's add control is suppressed
there and the gallery is re-balanced off the top. The layout, the item and the count line are unchanged.

The ground draws the full cover, not the small derivative that was prototyped: the derivative was too
blurred, so it and its `?size=small` route were dropped, and no filter is applied either.

Verified: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 347).

## Observed

The composition is the default dark media list: a 32px title top-left, a filled accent button top-right,
then rows of square artwork, a 24px name, a muted meta line, and two ghost icon buttons. The metadata is
PlayLiberty's (sync-shaped), but the composition is category-interchangeable: blur the strings and the same
layout serves a podcast app or an admin table. The design record calls the library a "gallery", and it does
not read as a personal, curated collection. The product's defining fact (your copy survives takedown) lives
only in the empty screen's body copy.

Related minor findings on the same surface:

- Two identical "Add a playlist" controls on the empty screen (header and gallery).
- The count sits on its own third line, while the detail screen puts it on the sync line.
- Nothing marks which playlist is playing on web (no pause glyph, no strip).
- The empty gallery is top-aligned, leaving a large void on a tall desktop.

## Expected

The library reads as PlayLiberty specifically: a personal, durable collection, with sync made visible
rather than the smallest muted line, and the playing playlist identifiable. This is a direction, not a
prescription; the shape is a design decision.

## Evidence

- Live, 2026-10-05, at 1440x900 and 390x844, populated and empty.
- [`DESIGN.md`](../../DESIGN.md) and
  [`library.md`](../../design-system/screens/library.md) name the gallery intent.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Design Specificity Verdict and
  Questions to Consider.
