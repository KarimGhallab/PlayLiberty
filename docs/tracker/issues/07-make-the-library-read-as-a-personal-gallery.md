# 07: Make the library read as a personal gallery

**State:** `needs-triage`
**Category:** `enhancement`

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
