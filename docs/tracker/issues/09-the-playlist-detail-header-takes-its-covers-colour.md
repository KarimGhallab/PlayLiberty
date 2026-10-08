# 09: The playlist detail header takes its cover's colour

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Implemented. `PlaylistHeader`'s `ground` prop now covers both arrangements: the card draws its cover behind
it, the card's opaque surface is dropped so the ground shows through its padding and behind the identity
band, and the ground is clipped to the card's rounded box. The sharp artwork stays on top. A no-cover
playlist takes the sleeve hue, the same derivation the library's row uses, so a playlist's row and the
header it opens agree. The detail passes `ground` to its header at both widths. The ground draws the full
cover, not the small derivative that was prototyped.

The identity band's text sits on an arbitrary image, the same uncomputable-contrast problem the equalizer
strip documents. The ground's opacity keeps it dark in practice, and a bright cover is the case to watch.

Verified: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 347).
