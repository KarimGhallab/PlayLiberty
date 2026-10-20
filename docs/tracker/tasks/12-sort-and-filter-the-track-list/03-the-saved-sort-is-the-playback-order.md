# 03: The saved sort is the playback order

**Status:** resolved

## Outcome

`applyRefetch` now treats the read's order as the order the queue plays in while unshuffled: the queue and the order kept beside it both adopt it, so the saved sort is the queue's source order rather than a decoration over a fixed one. A shuffled queue keeps its own arrangement and takes only the entries the read returns, because re-arranging a listener's shuffle under them would move the music. The playhead does not move: the current id survives the reorder and its offset is untouched, the existing rule for a current track that has left the source still clears the cursor, and turning the shuffle off returns to the saved order, because the order kept beside the queue is now that order. A sort press invalidates the playlist-scoped reads and the queue adopts the new order when they answer, and a load hydrates from `sessionStorage` and then adopts the server's order as the read answers, so the list and the queue cannot disagree while unshuffled.

See [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).
