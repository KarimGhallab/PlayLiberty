# 03: Revoke a share

**Status:** resolved

## Outcome

Implemented and verified. `DELETE /playlists/:id/shares/:accountId` is owner-only and answers `204`; `revokeShareForAccount` checks `isPlaylistOwner` first, so a write collaborator, a read collaborator and a stranger all answer the same `404`. The delete is idempotent: a share that is not there, including one aimed at an account that does not exist, leaves the playlist unchanged and still succeeds, so no target-account existence check is made, and `shareRoutes` no longer imports `sendNotImplemented` because the feature's last stub is gone. The five new tests cover the revocation and the empty listing, the target losing the library entry, the playlist read and the tracks listing, a revocation of a share that is not there and of an account that does not exist each leaving an existing share alone, the three non-owner refusals, and the missing client header. One criterion was narrowed with the user's agreement: the stream and the thumbnail answer `403` after a revocation, not the `404` the ticket asked for, because both are track routes and a track that exists but is unreachable answers `403` so "you cannot play this" is told apart from "this is not here"; the ticket's `404` holds for the playlist and its tracks.

See [`05-share-a-playlist`](../../specs/05-share-a-playlist.md).
