# 03: The saved sort is the playback order

**Blocked by:** [`02`](02-the-detail-sort-control.md).
**Status:** resolved

## Outcome

Implemented and verified. `applyRefetch` now treats the read's order as the order the queue plays in while
unshuffled: the queue and the order kept beside it both adopt it, so the saved sort is the queue's source order
rather than a decoration over a fixed one. A shuffled queue keeps its own arrangement and takes only the entries
the read returns, because re-arranging a listener's shuffle under them would move the music.

The playhead does not move: the current id survives the reorder and its offset is untouched, and the existing
rule for a current track that has left the source still clears the cursor. Turning the shuffle off returns to the
saved order, because the order kept beside the queue is now that order, so the round trip is one place rather
than two.

Both of the ticket's cases land through this one change: a sort press invalidates the playlist-scoped reads and
the queue adopts the new order when they answer, and a load hydrates from `sessionStorage` and then adopts the
server's order as the read answers. The list draws the same read, so the list and the queue cannot disagree while
unshuffled.

The tests: the `applyRefetch` describe proves the unshuffled queue adopts the read's order with the playhead kept,
and a shuffled queue keeps its own order across the same read while its source order follows. The
`useQueueRefetch` test now proves the wiring adopts the read's order and keeps the current track.

Verification: `pnpm test:unit` (web 408, server 354, packages 79), `pnpm run build`, `pnpm run lint` and prettier
pass. No em dashes. Not committed.
