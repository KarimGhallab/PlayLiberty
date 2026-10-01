# 04: Delete a playlist

**What to build:** An owner deletes a playlist and nothing waits on the disk. The playlist and its
associations are gone at once, and the stored audio and thumbnails stay where they are for the weekly prune to
reclaim, so the delete is fast and the disk catches up on its own. Every other playlist is untouched: a track
the deleted playlist held is still playable wherever else it is associated, and no other playlist's count
moves. A write collaborator, a read collaborator, a stranger and a missing playlist all answer `404`, and a
collaborator who had the playlist reads not-found from that moment.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An owner deletes a playlist, and the playlist and its associations are gone.
- [ ] The stored audio and thumbnail files are still on disk after the delete, for the prune to reclaim.
- [ ] Another playlist that holds one of the deleted playlist's tracks keeps its association, its count and its playback.
- [ ] A write collaborator, a read collaborator, a stranger and a missing playlist each answer `404`.
- [ ] The request is refused without the client header.
