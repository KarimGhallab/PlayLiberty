# 05: Remove a track from a playlist

**What to build:** An owner or a write collaborator removes one track from a playlist and the source does not
put it back. The association goes, the playlist's count moves with it, and a suppression for that playlist and
video id is written in the same transaction, so the next sync skips the video. The removal is a choice about
one playlist: the track row survives while any association remains, the file stays, and a playlist that still
holds the track keeps playing it. Removing an association that is not there answers `404`, the same as
removing from a playlist the caller cannot write, so the route confirms nothing it should not.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] An owner and a write collaborator each remove a track; the association is gone, the count moves by one, and a suppression exists for that playlist and video id.
- [x] The association, the count and the suppression move together in one transaction.
- [x] The track row and its file survive while another association remains, and a playlist that still holds the track keeps playing it.
- [x] A read collaborator, a stranger, a missing playlist and an association that is not there each answer `404`, and they cannot be told apart.
- [x] The request is refused without the client header.

## Outcome

Implemented and verified. `DELETE /playlists/:id/tracks/:trackId` answers `204` for an owner or a write
collaborator. `removeTrackForAccount` checks `canWritePlaylist` first, so a read collaborator, a stranger, a
missing playlist and an absent association all answer the same `404` and cannot be told apart. The suppression
is written by the association service rather than by the route, so no caller can remove without it:
`removeAssociation` now reads the video id with the association it is about to delete, then deletes, moves the
bounded count and inserts the suppression, all inside the transaction that already held the delete and the
count. The insert is a conflict-no-op, so a second removal cannot fail.

The five new tests cover the owner removal with the association gone, the count at zero and the suppression
present; the same for a write collaborator; the four `404` cases each writing nothing and leaving the
association and count untouched; a track that survives on disk and streams from a second playlist that still
holds it; and the missing client header.

`playlistRoutes` no longer imports `sendNotImplemented`, because every stub it held is now implemented; the
share routes keep theirs.

Verification: `pnpm run test` (161 server tests, 5 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
