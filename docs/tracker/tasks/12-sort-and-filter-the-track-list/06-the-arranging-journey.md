# The arranging journey

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

One browser journey proves the facts that are only true once the product is assembled: the saved order is
applied by the server and read again after a reload, the counts describe the whole playlist rather than the rows
drawn, and the controls go inert while the shuffled queue takes over.

## Context

Read the spec's testing decisions, and the shuffle and skip journeys, which are the closest assembled-product
tests. The browser is the owner, so the read-collaborator gating stays in the route and component tests.

## Scope

- One journey file, seeding one playlist with several stored tracks and one that fails to download, so the list
  holds two states at once.
- It asserts: the chips carry the whole-playlist counts before any press; newest first re-orders the list and
  the choice survives a reload; oldest first reverses it; the playlist's own order is reachable again; a chip
  narrows the list and the header's count line, and "All" restores both; a state with no rows draws the named
  empty state; the controls are disabled while shuffled and the list draws the shuffled order; and the saved
  sort is the order the transport walks while unshuffled.

## Out of scope

The read-collaborator view, which the dev proxy cannot reach because it fixes one browser identity, and the
counts of a very large playlist, which is not what a browser proves.

## Blocking edges

Blocked by [`03`](03-the-saved-sort-is-the-playback-order.md), which makes the order play, and
[`05`](05-the-detail-chip-row.md), which draws the chips and the empty state.

## Verification

- The e2e suite and the e2e typecheck pass.
