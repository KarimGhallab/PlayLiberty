# 19: Record the library item's deliberate actions

**What to build:** The library item deliberately omits a play control. A playlist is started from its own
screen, and the row's whole surface is the door that opens it, so the item carries shuffle and overflow and
nothing else. The records and the specimen still claim otherwise, so bring them to the shipped item.

- [`library.md`](../../design-system/screens/library.md) says an item "holds a play button, a shuffle and an
  overflow". It holds shuffle and overflow only.
- [`playlist-header.md`](../../design-system/components/playlist-header.md) says the equalizer strip "is also
  the only thing that says which playlist is playing now that every item has a play button". No item has one,
  so the strip never renders on the library.
- [`library.html`](../../design/screens/library.html) draws `aria-label="Play this playlist"` on the library's
  row items. The web row item must lose the control, so the specimen and the component agree.
- Add the absence to the library record's own list of differences from the card arrangement, beside the
  overflow and the transport, with the reason: play starts inside the playlist, and the item's surface press
  is the door.

The shuffle decision is already recorded, in [`library.md`](../../design-system/screens/library.md) under
"Shuffle is on every item" and in [`playlist-header.md`](../../design-system/components/playlist-header.md)
under "The actions, and what the library adds to them". Leave it, and make sure the play correction does not
contradict it.

**Blocked by:** None. Can start immediately.

**Status:** open

**Labels:** `enhancement`, `ready-for-agent`

- [ ] `library.md` no longer claims the item holds a play button, and names the absence in its list of differences.
- [ ] `playlist-header.md` no longer implies an item play button, and the strip's "now playing" claim is scoped to the arrangements that draw a play.
- [ ] `docs/design/screens/library.html` draws the web row item without a play control.
- [ ] The shuffle record stands.

**Verification:** `node docs/design/scripts/validate-design-tokens.cjs` passes, and a grep of the two records
and the specimen finds no play control on the library item.

## Outcome

Done. The library item is recorded as a door rather than a play, and the specimen and both records now agree.

- [`library.html`](../../design/screens/library.html): the seven web row play controls went, and the two rows
  that drew a playing state (a transport with a pause, and the equalizer strip) were returned to the resting
  arrangement the component actually renders, with the section notes that measured them rewritten. The mobile
  cards keep their play and pause; a web row now carries the shuffle and the overflow alone.
- [`library.md`](../../design-system/screens/library.md): the "holds a play button" claim is gone; "What the
  item deliberately does not carry" names the play and the now-playing cost; the two playing figures in the
  numbers table and the truncation note are corrected to the resting numbers.
- [`playlist-header.md`](../../design-system/components/playlist-header.md): the strip's "every item has a
  play button" claim is scoped to the arrangements that draw a play, and "The actions" states that the library
  takes the play away and its column is the shuffle and the overflow alone.

Verification: `node docs/design/scripts/validate-design-tokens.cjs` passes; a grep of both records finds no
item play claim, and the specimen's web rows carry no `.play`, `.transport` or `.bars`. Not committed.
