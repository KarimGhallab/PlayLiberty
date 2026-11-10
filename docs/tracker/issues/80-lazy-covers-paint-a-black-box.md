# 80: Lazy covers paint a black box

**State:** `resolved`
**Category:** `bug`

## Outcome

Every playlist cover box in the three header arrangements now carries its derived sleeve index even while a cover exists, and its ground is `var(--sleeve, var(--surface-raised))`. A cover that is still arriving paints the playlist's hue instead of a black or grey square. The no-art and failed-cover states keep the hatch over that same hue.

The card hero loads eagerly; the tile, the card item and the row cover stay lazy, and every image keeps its `decoding` hint.

The header tests cover the lazy row, tile and card item, the eager hero, the sleeve ground while a cover exists, and the sleeve fallback after an image error.
