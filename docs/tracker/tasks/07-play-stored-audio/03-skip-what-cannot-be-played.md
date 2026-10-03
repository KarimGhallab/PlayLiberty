# 03: Skip what cannot be played

**What to build:** Nothing on screen lies about what can be heard. A track is playable exactly when its stored
file exists, which the track's file status says, and a track that is not playable has no play control and is not
put in a queue built from its playlist. A queue entry whose file is gone when it is reached is dropped and
playback continues to the next one, and a track that fails to load mid-queue behaves the same, so one broken
track ends nothing. A track that is not found is dropped and the queue advances, which is what a revoked share
or a pruned track looks like. A refusal because the session has expired is not a playback error and is never
shown as a broken track: it takes the client to the edge's sign-in through the client's own re-authentication
path.

**Blocked by:** [`01`](01-build-the-queue-and-play-it.md), [`02`](02-the-audio-element-and-the-browser-controls.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A track whose file status is not stored has no play control and is not in a queue built from its playlist.
- [ ] A queue entry whose file has gone when it is reached is dropped and playback advances.
- [ ] A track that fails to load mid-queue is dropped and playback advances.
- [ ] A track that is not found is dropped and playback advances.
- [ ] An expired session is not presented as a playback error, and triggers the client's re-authentication path instead.
- [ ] A track that has left the source but is still stored plays.
