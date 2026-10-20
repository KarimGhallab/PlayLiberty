# 04: The section in the design and the two glyphs in the pinned set

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The library's web arrangement is a four-column grid of tiles at 252px: the cover, the play on the cover's own bottom-left corner, the identity under it, and the shuffle and the overflow at the actions row's end, in four states (playing with the 2px `--emphasis` line along the foot and the pause, syncing with the `--emphasis` cover ring, a failed sync with `--tone-failed` there, and no artwork with a sleeve and the hatch). The pinned section draws a labelled `Pinned` heading above its own grid and a 1px `--control-border` boundary the width of the column with the name `Other playlists` under it, and the pin items lead the item's overflow: an owner's reads five with `Unpin` first, a writer's reads `Pin` and `Sync now`, and a reader's reads the pin alone, with the panel opening upward into the picture because the control is at the item's foot. The two glyphs `pin` and `pinned-off` join `PINNED_ICONS` with the release's path data verbatim, all 27 of 27 pinned glyphs used, and a tile that names an owner is 420px (its own row under the count). The record keeps two recorded divergences rather than fixing them: the library card renders its own overflow (`PlaylistCardHeader`'s `item` variant), and the tile's actions row leads with the `IncompleteBadge` pill.

See [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md).
