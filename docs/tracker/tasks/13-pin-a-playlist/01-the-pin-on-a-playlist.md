# 01: The pin on a playlist

**Blocked by:** None. Can start immediately.
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

An account can pin a playlist to its own gallery and unpin it through the API, and the gallery's own read
returns that account's pinned playlists first with a flag on every item. Nothing on screen moves yet: this is
the whole feature behind the API, so the screen tickets have a read and a write to consume.

## Context

Read [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md) first. Its Implementation Decisions are the
decisions this ticket implements, and none of them is open.

The per-playlist settings are the precedent for the mutation: both are validated, answered with the updated
playlist, and reached through the access entry seam. This one differs in the two ways that matter. It is per
account rather than per playlist, which makes it the schema's first per-account row, and it is gated on the
read requirement rather than on write, because visibility is the whole requirement for placing a playlist in
your own gallery and not someone else's.

The playlist list read already returns the page the gallery draws. Identity reaches the route from the edge
headers, and every mutating request carries the client header.

## Scope

- **A new per-account, per-playlist row**: the account, the playlist, and the instant it was pinned. Both
  foreign keys cascade, the pair is the primary key, and an index serves the account's order. No update
  timestamp and no position column.
- **The row's existence is the pin.** Pinning again refreshes the instant rather than failing; unpinning
  deletes the row. There is no cap.
- **A required flag on the playlist every read returns**, so the gallery's one read carries it and the client
  needs no second source of truth about order.
- **The list read returns the account's pins first**, most recently pinned first, then the order it uses today
  for everything else. The page's total is unchanged, and the items below keep the order they had.
- **The mutation is a patch on the playlist taking a required boolean**, validated, answering the updated
  playlist, resolving the playlist through the access entry seam at the read requirement. A stranger, a
  missing playlist and one the account cannot see are one not-found. The handler writes per-account state and
  never the playlist.
- **No event is published.** A pin is not a change to the playlist, and the playlist-changed event reaches
  every account that can see it.
- **A revoked share hides the pin and a re-grant restores it.** The row references the account and the
  playlist and not the share, and nothing sweeps the table.
- **The fixtures gain what the new cases need**: a way to seed a pin, and a way to build the playlist literal
  with the flag, since the field is required.

## Out of scope

The screen, the menu item, the cover control, the specimen and the glyphs. An explicit pin order. A pin event.
The pin on the card arrangement.

## Verification

- `pnpm test:unit`, `pnpm run build`, `pnpm run lint` and prettier pass.
- The route suite proves: the list read returns the pins first in the order they were pinned and the rest in
  creation order, with the flag on each item; a second pin of the same playlist refreshes the instant rather
  than failing, and unpinning removes it; one account's pin leaves another account's list order unchanged, and
  both can pin the same shared playlist; a playlist the account cannot see, a missing playlist and a stranger
  are one not-found in both directions; a changed body is a validation failure; deleting a playlist takes its
  pins with it; and a revoked share hides a pin that a re-grant returns.
