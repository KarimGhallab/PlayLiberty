# 69: DESIGN.md describes a library tile that does not ship

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** `docs/DESIGN.md` claims the web library draws a wide tile with the cover beside the identity; the shipped tile puts a square cover above the identity, and the cover-beside-identity shape ships only as the phone detail header. The document is corrected, not the code.

**Current behavior:**
`docs/DESIGN.md:59` reads "on the web a wide tile with the cover beside the identity, on a phone a card with the cover above it". Measured at 1440, a gallery item is `data-arrangement="tile"`, 252x396, with a 236x236 square cover above the identity, and `PlaylistTileHeader.tsx:11-15` describes the tile as "the cover above the identity". `PlaylistRowHeader` is the cover-beside-identity shape and is used as the phone detail header, not in the gallery. The claimed web/phone contrast is therefore false, and the file's own preamble exists so that a design record cannot describe a product that no longer exists.

The decision taken on 2026-10-16 is that the code is right and the document is corrected.

**Desired behavior:**
`docs/DESIGN.md` describes the shapes the clients draw: the three arrangements (row, card, tile), which surface uses which, and the gallery's grid. It keeps naming roles and rules and no literal, as it does today.

**Key interfaces:**

- `docs/DESIGN.md` remains the one design record; this is an edit to its "settled arrangements" section.
- No layout changes; the tile, the card and the row stay where they are.

**Acceptance criteria:**

- [ ] The gallery bullet matches the shipped tile on the web and the card on a phone.
- [ ] Every other "settled arrangement" bullet that pairs a surface with an arrangement is checked against the code in the same pass, and corrected or confirmed.
- [ ] No literal value is introduced, per the file's own rule.
- [ ] `docs/DESIGN.md` and the header components agree on the arrangement names.

**Out of scope:**

- Changing the gallery layout or moving `PlaylistRowHeader`.
- `docs/PRODUCT.md` and `docs/ARCHITECTURE.md`.

## Observed

- `docs/DESIGN.md:59` describes a web tile with the cover beside the identity.
- The shipped tile is 252x396 with a 236x236 square cover above the identity.
- The cover-beside-identity shape ships only as the phone detail header.

## Expected

- The design record describes the arrangement the client actually draws on each surface.

## Evidence

- `docs/DESIGN.md:55-64`.
- `apps/web/src/shared/components/PlaylistHeader/PlaylistTileHeader.tsx:11-15`; `PlaylistHeader.module.scss:920-938`.
- `apps/web/src/views/library/LibraryPage/LibraryPage.tsx:111` (`layout={isMobile ? 'card' : 'tile'}`).
- Impeccable critique of `apps/web`, 2026-10-16, design-specificity verdict; measured at 1440x900.
