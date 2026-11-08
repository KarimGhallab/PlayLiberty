# 02: Open a playlist at the shared track

**Status:** resolved

## Outcome

Opening `/playlists/P?track=T` starts the playlist unshuffled with `T` at its own place in the order. The whole queue comes through the existing play transition, the current track is `T` at position zero, and shuffle is false. The entry is idempotent: the same target does not restart or seek, a loaded queue at another track moves to `T`, and another queue is replaced by `P` at `T`. While `P` is the queue, the address bar replaces `?track` with the current track on every change; when `P` is not the queue the param is absent, and the gallery stays `/`. A reload restores the persisted queue paused because the entry treats the same target as already done.

The `track` search param is validated on the playlist route and ignored when empty. Degraded links remain ticket 05: an unreachable playlist still draws the not-found body, and a present but unplayable track still uses the existing refusal.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
