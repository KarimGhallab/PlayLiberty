# Pin a playlist on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The gallery is one grid in name order, and the playlist a person returns to drifts further down as the account grows.
The web client has a per-account pin and a pinned section; the app has neither, and its grid is read by thumb, so the
playlist that is always wanted is the one that costs the most scrolling.

## Solution

Pin and Unpin are items in the playlist's actions sheet, and the gallery draws a Pinned section above the rest of the
grid, in name order and without a count. The section exists only while something is pinned, and a pinned playlist is
lifted out of the grid below rather than drawn twice. The pin is the account's own and never moves anybody else's
gallery.

## User Stories

1. As an account, I want to pin a playlist, so that it stays at the top of my gallery.
2. As an account, I want to unpin it, so that it returns to its place in the list.
3. As an account, I want the pinned section above the grid, so that I reach it without scrolling.
4. As an account, I want the section absent when nothing is pinned, so that an empty heading is never drawn.
5. As an account, I want a pinned playlist drawn once, so that it does not appear twice.
6. As an account, I want the pinned section in name order, so that it is predictable.
7. As an account, I want no count on the heading, so that the gallery does not carry a standing total.
8. As a collaborator, I want to pin a playlist shared with me, so that my own gallery is mine.
9. As a collaborator, I want my pin not to move anybody else's gallery, so that a shared playlist is not a shared order.
10. As a reader, I want Pin to be the one action in my sheet, so that I am not left with nothing.
11. As an account, I want the pin to follow me to another device, so that it is the account's and not the phone's.
12. As an account, I want the pin to apply immediately, so that I do not wait for a round trip to see it move.
13. As an account, I want a failed pin explained, so that I know the move did not happen.
14. As an account, I want the pin to survive a share being revoked and re-granted, so that my placement is not lost.
15. As a screen-reader user, I want the section announced as a heading, so that I can skip to it.
16. As a French-speaking account, I want the heading and the items in French, so that the app stays in my language.

## Implementation Decisions

- **Pin and Unpin are items in the actions sheet, labelled with the action.** The item reads Pin while unpinned and
  Unpin while pinned, so it needs no pressed state. `Decided here:` the web's wording, kept because the label is the
  action.
- **A reader's actions sheet holds Pin and Unpin alone.** Visibility is the whole of what pinning needs, so a share
  at the read level otherwise offers nothing. `Decided here:` the web's rule, kept rather than hiding the sheet.
- **The pinned section is a heading above the grid, in name order, with no count.** The items are the same card at
  the same arrangement, and the section exists only while something is pinned.
- **A pinned playlist is lifted out of the grid below rather than drawn twice.**
- **The pin is optimistic.** The card moves on the press and the read is invalidated on the answer. `Decided here:`
  a pin that waits for a round trip reads as a dropped press, and the web makes the same move optimistically.
- **The pin publishes no event, and the acting client invalidates the gallery itself.** The cost is recorded: a second
  device of the same account stays stale until its next read.
- **The loading state does not change.** A pinned stub would flash and withdraw or promise a pin the account may not
  have.
- **Inherited decisions are referenced, not restated:** the per-account table, the visibility rule, the name order,
  the no-cap rule, the no-event rule and the outliving of a revoked share are
  [`13-pin-a-playlist`](13-pin-a-playlist.md)'s.

## Testing Decisions

- A test earns its place only if it fails when behaviour an account would notice. The tests assert that the pinned
  section is drawn only with a pin, that a pinned card is absent from the grid below, that the item's label follows
  the state, and that a reader's sheet holds the two items alone. They do not assert the section's spacing or the
  heading's style.
- **The gallery's grouping is tested at the gallery's seam**: the three groups, the section's absence and the
  no-duplicate rule. Prior art is the web library's pinned-section tests.
- **The item is tested at the shared actions model's seam**: the label, the reader's sheet, and the optimistic frame.
- **The critical journey is a Maestro flow**: pin a playlist from its card, see it above the grid, and unpin it.
- **Cut tests:** no test of the heading's typography, the card's scrim, or the invalidation's key.

## Out of Scope

- An explicit pin order, a drag, and a stored position.
- A cap on how many playlists an account pins.
- Pinning a track or anything else.
- A live event for the pin, and a second device staying current.
- A pin control on the detail screen.

## Further Notes

- The pin is the gallery's one exception to the single list, and the reason is the account's own placement rather
  than a second meaning for a shared item.
