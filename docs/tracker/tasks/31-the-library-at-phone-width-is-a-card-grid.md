# 31: The library at phone width is a card grid

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The library uses the header's tile above 767px and its card at and below, on `repeat(auto-fill, minmax(172px, 1fr))` with `--space-3` gaps: two 173px columns at 390, four 174.75px at 767. The card is a door and it plays: the picture is a link with the name beside it, the band holds the play that starts the playlist and becomes the pause while it is the queue, the shuffle sits on the picture's top-left corner, the count and the sync state share one line, and the mark ends the name row. The add control is the floating action at that width, and each page pays its 185px clearance in its own bottom padding.

See [`08-see-the-library`](../specs/08-see-the-library.md).
