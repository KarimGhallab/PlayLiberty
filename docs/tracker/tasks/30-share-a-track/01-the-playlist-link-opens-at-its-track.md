# 01: The playlist link opens at its track

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The playlist route now reads the `track` search parameter and passes it to the detail, which captures it once per
mount so the address mirror that follows cannot be mistaken for a second link. When the playlist and queue reads
land, another queue starts this playlist at the shared track with shuffle off; the same playlist at another track
jumps; the same track is a no-op, so a repeated link neither restarts nor seeks. The queue keeps the playlist's
order, earlier tracks stay before the shared track, and the store still stops at the end.

The detail reports the track its address should name: the current track while it is the queue, and none once a link
has settled and the detail is not the queue. The route writes that with `router.setParams`, and a null removes the
parameter. A plain playlist path starts nothing; the mirror may still name the playing track.

The unreachable playlist, the track that left it, and the track that cannot play are not acted on here; `03` owns
those outcomes.

See [`30-share-a-track`](../../specs/30-share-a-track.md).
