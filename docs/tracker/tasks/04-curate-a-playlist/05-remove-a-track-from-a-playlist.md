# 05: Remove a track from a playlist

**What to build:** An owner or a write collaborator removes one track from a playlist and the source does not
put it back. The association goes, the playlist's count moves with it, and a suppression for that playlist and
video id is written in the same transaction, so the next sync skips the video. The removal is a choice about
one playlist: the track row survives while any association remains, the file stays, and a playlist that still
holds the track keeps playing it. Removing an association that is not there answers `404`, the same as
removing from a playlist the caller cannot write, so the route confirms nothing it should not.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An owner and a write collaborator each remove a track; the association is gone, the count moves by one, and a suppression exists for that playlist and video id.
- [ ] The association, the count and the suppression move together in one transaction.
- [ ] The track row and its file survive while another association remains, and a playlist that still holds the track keeps playing it.
- [ ] A read collaborator, a stranger, a missing playlist and an association that is not there each answer `404`, and they cannot be told apart.
- [ ] The request is refused without the client header.
