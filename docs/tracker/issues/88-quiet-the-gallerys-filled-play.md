# 88: Quiet the gallery's filled play

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The gallery's per-item play now rests on a raised surface with a control border and an ink glyph instead of the accent fill. It takes the accent on hover, on `:focus-visible`, and while its arrangement carries `data-state="playing"`, so the playing queue is still marked. The detail hero, the detail's phone row, the player bar and both add controls keep their fills.

The play glyph now uses `currentColor`, so one play control carries the quiet and filled states without a second glyph rule. `docs/DESIGN.md`'s accent rule records that the gallery's accent marks the add and the playing queue, not every tile.
