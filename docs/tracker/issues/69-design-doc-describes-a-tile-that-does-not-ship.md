# 69: DESIGN.md describes a library tile that does not ship

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`docs/DESIGN.md` now records the shapes the clients draw. The gallery bullet says the library draws a tile on the web and a card on a phone, both with the cover above the identity, in as many columns as the width holds, and adds that an empty gallery offers its own labelled add button instead of the header's or the floating one. The header bullet names all three arrangements by their cover-to-identity relationship and states which surface uses which: the row is the phone detail header, the card is the web detail's hero and the phone's gallery item, and the tile is the web's gallery item.

The same pass checked every other "settled arrangements" bullet against the code and confirmed them: the detail's two columns with the pinned identity column (`PlaylistDetailPage.module.scss:83-103`) and its sticky phone header (`:224-239`); the chips wrapping at a desk and scrolling behind an edge fade on a phone (`PlaylistFilterChips.module.scss:44-63`); the player bar's absence at rest and the padding both pages pay it; the track row's play layer and its lane; and the widths and their single breakpoint. The header bullet also lost a false claim: the arrangement is chosen by the view, not by the component, which is why `LibraryPage` passes `card` or `tile` and `PlaylistDetailPage` passes `row` or `card`.

No literal value was introduced, and no component, stylesheet or layout changed.
