# 04: The section in the design and the two glyphs in the pinned set

**Blocked by:** None.
**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The library's web arrangement is the **tile**, which had never been drawn: the drawing still showed the
136px row gallery the tile replaced in [`30`](../30-the-library-as-a-gallery-of-tiles.md), so the pinned
section could not be drawn as "the same tile at the same arrangement" without the redraw first. The tile's
rules moved beside the row's and the card's, extending the sleeve, state and cover-ring
rules the two already had, and the library's web arrangement is now a four-column grid of them at 252px: the
cover, the play on the cover's own bottom-left corner, the identity under it, and the shuffle and the overflow
at the actions row's end. Four states are drawn: **playing** (the 2px `--emphasis` line along the foot and the
pause), **syncing** (the `--emphasis` cover ring), **a failed sync** (`--tone-failed` there) and **no artwork**
(a sleeve and the hatch).

The design draws the **pinned section**: a labelled `Pinned` heading above its own grid, the boundary that
follows, and the gallery below it. That boundary is a 1px `--control-border` rule the width of the column and
the name `Other playlists` under it, and it is the whole of what the section adds; the design carries the
decision, the token it borrows and the three separations that were drawn beside it and rejected.

The item's overflow carries the **pin items**. "The three overflows, one per access level" now draws one tile
per access level with its panel open: an owner's reads five with `Unpin` first, a writer's reads `Pin` and
`Sync now`, and a reader's reads the pin alone, where the section used to say a reader got no overflow at all.
The panel opens upward, into the picture, because the control is at the item's foot.

The two glyphs join the pin and the icons record. `pin` and `pinned-off` are in `PINNED_ICONS` with the
release's path data verbatim, and a new paragraph says which is
the action, why they are the pair, and why neither carries an optical correction: the pin's quarter of a unit
is under the correction's own threshold, and the unpinning's slash spans the box. All
**27 of 27** pinned glyphs are used, with no provenance problem.

The screen design was amended where the redraw made it false: the item adds three things rather than four,
both arrangements play from their artwork rather than the tile being a door, a tile that names an owner is
420px (its own row under the count, and a grid row takes its tallest tile), and the overflow's three menus hold
the pin.

Two divergences are recorded rather than fixed, because neither is this ticket's and both want a decision:

- **The card's overflow.** The library design said the card "drops the overflow", and its card grid
  drew none; the app renders one for a library card (`PlaylistCardHeader`'s `item` variant), the design's own
  figures table puts the chip on the cover's top-right, and `library.spec.ts` opens it over the docked bar. The
  design contradicted itself and the drawing was on the losing side.
- **The mark.** The tile's actions row leads with the `IncompleteBadge` pill, which the design did not draw
  because the mark's own glyph, `download`, is not in the pin. A tile whose files are all stored draws no mark,
  so the drawn tiles are correct without one, but the incomplete state is undrawn.

Verification: `pnpm test:unit`, `pnpm run build`, `pnpm run lint` and
`pnpm test:e2e` pass. No em dashes. Not committed.
