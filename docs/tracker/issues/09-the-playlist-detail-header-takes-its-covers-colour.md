# 09: The playlist detail header takes its cover's colour

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`PlaylistHeader`'s `ground` prop covers both arrangements: the card draws its cover behind it, the card's opaque surface is dropped so the ground shows through its padding and behind the identity band, and the ground is clipped to the card's rounded box, with the sharp artwork on top. A no-cover playlist takes the sleeve hue, the same derivation the library's row uses, so a playlist's row and the header it opens agree, and the ground draws the full cover rather than the small derivative that was prototyped. The identity band's text sits on an arbitrary image, the same uncomputable-contrast problem the equalizer strip documents, and a bright cover is the case to watch.
