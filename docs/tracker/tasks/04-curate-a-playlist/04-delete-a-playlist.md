# 04: Delete a playlist

**What to build:** An owner deletes a playlist and nothing waits on the disk. The playlist and its
associations are gone at once, and the stored audio and thumbnails stay where they are for the weekly prune to
reclaim, so the delete is fast and the disk catches up on its own. Every other playlist is untouched: a track
the deleted playlist held is still playable wherever else it is associated, and no other playlist's count
moves. A write collaborator, a read collaborator, a stranger and a missing playlist all answer `404`, and a
collaborator who had the playlist reads not-found from that moment.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] An owner deletes a playlist, and the playlist and its associations are gone.
- [x] The stored audio and thumbnail files are still on disk after the delete, for the prune to reclaim.
- [x] Another playlist that holds one of the deleted playlist's tracks keeps its association, its count and its playback.
- [x] A write collaborator, a read collaborator, a stranger and a missing playlist each answer `404`.
- [x] The request is refused without the client header.

## Outcome

Implemented and verified. `DELETE /playlists/:id` removes the playlist for the owner and answers `204`;
`deletePlaylistForAccount` checks `isPlaylistOwner` first, so a write collaborator, a read collaborator, a
stranger and a missing playlist all answer the same `404`. The associations and shares go with the row through
the foreign key cascade, which is the one place the association service's rule is bypassed; the migration
emits `ON DELETE cascade` and the connection sets `foreign_keys = ON`, so the cascade is real rather than
assumed, and the only stored count that would need adjusting is the deleted playlist's own. No media is
touched, so the delete never waits on the disk and the weekly prune reclaims a file once no association names
its track.

The six new tests cover the owner delete with the playlist and its associations gone, the stored file and the
now-orphan track row surviving on disk, a second playlist that holds the same track keeping its association,
its count and a working stream response, the four non-owner cases each answering `404` with the playlist left
in place, a collaborator reading not-found from the moment of deletion, and the missing client header.

Verification: `pnpm run test` (156 server tests, 6 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
