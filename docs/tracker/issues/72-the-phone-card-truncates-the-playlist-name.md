# 72: The phone gallery card truncates the playlist name

**State:** `resolved`
**Category:** `bug`

## Outcome

The card item draws the library's incomplete mark beside the count, not in the name row. The name row now holds only the name and the share mark, so the mark no longer sets the name's width; the mark still shows its count and breakdown on the card. The tile keeps the mark in its actions row and the row keeps its current placement.

A phone e2e test seeds a playlist named "Etoiles" with a failed download, waits for the badge, and measures the card's name link at 390: the name is not clipped by the mark.
