# 06: The queue follows the playlist

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The queue read now feeds the live queue. When the detail's queue read settles or refetches, it is merged over a queue
that already belongs to the same playlist: known ids keep the order already playing, including a shuffled order, new
ids append in the server's order, and ids the read no longer returns are gone. A read of another playlist is ignored,
so a queue cannot accumulate across playlists, and a read with nothing changed does not update the store.

The source order follows the incoming list, so turning shuffle off restores the playlist's current order. A current
track that remains keeps its position and play state. One that leaves stops playback, clears the position and the
seek request, and removes the bar. Starting another playlist still replaces the queue through `start`. The detail list
still mirrors the queue while shuffle is on.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
