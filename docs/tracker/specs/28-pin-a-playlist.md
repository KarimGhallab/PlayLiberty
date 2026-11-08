# Pin a playlist on mobile

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The gallery is one grid in name order, and the playlist a person returns to drifts further down as the account grows.
The web client has a per-account pin and a pinned section, and the app's gallery inherited both when spec `21` was
built: the per-account pin, the Pinned heading, the menu item and the optimistic move already ship. The app's pinned
section is one horizontal row that peeks the next card rather than a copy of the grid below. What the mobile corpus
still lacks is the journey that proves the move on the device: the flow stopped at the heading and never unpinned.

## Solution

Pin and Unpin are items in the playlist's actions sheet, and the gallery draws a Pinned section above the rest of the
grid, in name order and without a count. The section is one horizontal row of the same cards, exists only while
something is pinned, and a pinned playlist is lifted out of the grid below rather than drawn twice. The pin is the
account's own and never moves anybody else's gallery.

## Implementation Decisions

- **Pin and Unpin are items in the actions sheet, labelled with the action.** The item reads Pin while unpinned and
  Unpin while pinned, so it needs no pressed state. `Decided here:` the web's wording, kept because the label is the
  action.
- **A reader's actions sheet holds Pin and Unpin alone.** Visibility is the whole of what pinning needs, so a share
  at the read level otherwise offers nothing. `Decided here:` the web's rule, kept rather than hiding the sheet.
- **The pinned section is a heading above one horizontal row, in name order, with no count.** The items are the same
  card, the row peeks the next card, and the section exists only while something is pinned.
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
- **The pin is the gallery's one exception to the single list.** Its reason is the account's own placement, not a second meaning for a shared item.

## Out of Scope

- An explicit pin order, a drag, and a stored position.
- A cap on how many playlists an account pins.
- Pinning a track or anything else.
- A live event for the pin, and a second device staying current.
- A pin control on the detail screen.
