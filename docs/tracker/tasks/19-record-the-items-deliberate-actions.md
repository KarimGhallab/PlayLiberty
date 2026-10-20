# 19: Record the library item's deliberate actions

**What to build:** The library item deliberately omits a play control. A playlist is started from its own
screen, and the row's whole surface is the door that opens it, so the item carries shuffle and overflow and
nothing else. The design still claims otherwise, so bring it to the shipped item.

- The library design says an item "holds a play button, a shuffle and an
  overflow". It holds shuffle and overflow only.
- The playlist-header design says the equalizer strip "is also
  the only thing that says which playlist is playing now that every item has a play button". No item has one,
  so the strip never renders on the library.
- The library's drawn rows carry `aria-label="Play this playlist"`. The web row item must lose the control, so
  the drawing and the component agree.
- Add the absence to the library design's own list of differences from the card arrangement, beside the
  overflow and the transport, with the reason: play starts inside the playlist, and the item's surface press
  is the door.

The shuffle decision is already recorded under "Shuffle is on every item" and under
"The actions, and what the library adds to them". Leave it, and make sure the play correction does not
contradict it.

**Blocked by:** None. Can start immediately.

**Status:** open

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The library design no longer claims the item holds a play button, and names the absence in its list of differences.
- [ ] The playlist-header design no longer implies an item play button, and the strip's "now playing" claim is scoped to the arrangements that draw a play.
- [ ] The library drawing draws the web row item without a play control.
- [ ] The shuffle decision stands.

**Verification:** a grep of the two records
and the drawing finds no play control on the library item.

## Outcome

Done. The library item is recorded as a door rather than a play, and the drawing and both records now agree.

- The library drawing: the seven web row play controls went, and the two rows
  that drew a playing state (a transport with a pause, and the equalizer strip) were returned to the resting
  arrangement the component actually renders, with the section notes that measured them rewritten. The mobile
  cards keep their play and pause; a web row now carries the shuffle and the overflow alone.
- The library design: the "holds a play button" claim is gone; "What the
  item deliberately does not carry" names the play and the now-playing cost; the two playing figures in the
  numbers table and the truncation note are corrected to the resting numbers.
- The playlist-header design: the strip's "every item has a
  play button" claim is scoped to the arrangements that draw a play, and "The actions" states that the library
  takes the play away and its column is the shuffle and the overflow alone.

Verification: a grep of both records finds no
item play claim, and the drawing's web rows carry no `.play`, `.transport` or `.bars`. Not committed.
