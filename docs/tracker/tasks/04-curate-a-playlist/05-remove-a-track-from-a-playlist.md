# 05: Remove a track from a playlist

**Status:** resolved

## Outcome

Implemented and verified. `DELETE /playlists/:id/tracks/:trackId` answers `204` for an owner or a write collaborator; `removeTrackForAccount` checks `canWritePlaylist` first, so a read collaborator, a stranger, a missing playlist and an absent association all answer the same `404` and cannot be told apart. The suppression is written by the association service rather than by the route, so no caller can remove without it: `removeAssociation` reads the video id with the association it is about to delete, then deletes, moves the bounded count and inserts the suppression, all inside the transaction that already held the delete and the count, and the insert is a conflict-no-op so a second removal cannot fail. The five new tests cover the owner removal with the association gone, the count at zero and the suppression present, the same for a write collaborator, the four `404` cases each writing nothing and leaving the association and count untouched, a track that survives on disk and streams from a second playlist that still holds it, and the missing client header. `playlistRoutes` no longer imports `sendNotImplemented`, because every stub it held is now implemented, while the share routes keep theirs.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
