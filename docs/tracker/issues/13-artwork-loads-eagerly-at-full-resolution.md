# 13: Artwork loads eagerly at full resolution

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The list artwork is deferred and the hero stays eager, with no stylesheet change. In `TrackRow.tsx` the tile's `<img>` carries `loading="lazy"` and `decoding="async"`, and in `PlaylistHeader.tsx` the row arrangement (the library item) carries both, while the card arrangement (the detail's hero, above the fold) and the `PlayerBar.tsx` rail carry `decoding="async"` only. Every box was already reserved (the 96px cover, the card's `aspect-ratio: 1`, the 40px track tile, the player rail's `aspect-ratio: 1`), so a deferred image cannot shift layout.
