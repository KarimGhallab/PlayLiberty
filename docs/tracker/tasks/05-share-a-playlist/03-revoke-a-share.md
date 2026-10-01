# 03: Revoke a share

**What to build:** An owner takes a share back and it stops mattering at once. `DELETE
/playlists/:id/shares/:accountId` removes the share for the owner. The revocation takes effect on the next
request: the playlist drops out of the target's library, and the playlist read, its tracks, the stream and the
thumbnail all answer the same `404` a playlist that never existed answers, so a revoked share is a gone
playlist and not a fault. Revoking a share that is not there, including for an account that does not exist,
leaves the playlist unchanged and still succeeds, because the end state it asks for already holds. A stream
already in flight is not interrupted, because cutting it mid-file leaves a player with a half buffer and no
way back. Only the owner may revoke; a collaborator and a stranger answer `404`.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The owner revokes a share and it is gone from the listing.
- [ ] After revocation the playlist no longer appears in the target's library.
- [ ] After revocation the playlist read, its tracks, the stream and the thumbnail each answer `404` for the target, the same as a playlist that never existed.
- [ ] Revoking a share that is not there leaves the playlist unchanged, and a target account that does not exist answers the same.
- [ ] A write collaborator, a read collaborator and a stranger cannot revoke: each answers `404`.
- [ ] The request is refused without the client header.
