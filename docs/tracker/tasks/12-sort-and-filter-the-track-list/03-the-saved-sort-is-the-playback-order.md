# The saved sort is the playback order

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

While the list is unshuffled, it is the order that plays: the queue is the saved order, on load and on a change,
and the track that was playing keeps playing. A shuffle overrides the order, and turning the shuffle off returns
to it.

## Context

Read the spec's decision on the queue's source order, and the detail design record's rule that the track list is
the queue. The queue is client state, and its order is re-applied over every refetch; this ticket makes the
unshuffled queue adopt the server's saved order instead of the order it was restored with.

## Scope

- The unshuffled queue is rebuilt in the read's order when the saved value changes and when a client loads, with
  the track that was playing and its position kept.
- A shuffle overrides the saved order, and turning the shuffle off returns to it.
- The order the listener can see is the order that plays: the list and the queue cannot disagree while
  unshuffled.

## Out of scope

The control (ticket `02`), the filter (tickets `04` and `05`), and any change to how a shuffle draws its own
order.

## Blocking edges

Blocked by [`02`](02-the-detail-sort-control.md), which is the control that changes the value in the session.

## Verification

- `pnpm run test` (the store and refetch tests) and `pnpm run build` pass.
- The store tests prove: the unshuffled queue adopts the read's order with the playhead kept, and a shuffled
  queue keeps its own order across the same read.
