# 04: Delete a playlist

**Status:** resolved

## Outcome

Implemented and verified. `DELETE /playlists/:id` removes the playlist for the owner and answers `204`; `deletePlaylistForAccount` checks `isPlaylistOwner` first, so a write collaborator, a read collaborator, a stranger and a missing playlist all answer the same `404`. The associations and shares go with the row through the foreign key cascade, the one place the association service's rule is bypassed: the migration emits `ON DELETE cascade` and the connection sets `foreign_keys = ON`, so the cascade is real rather than assumed, and the only stored count that would need adjusting is the deleted playlist's own. No media is touched, so the delete never waits on the disk and the weekly prune reclaims a file once no association names its track. The six new tests cover the owner delete with the playlist and its associations gone, the stored file and the now-orphan track row surviving on disk, a second playlist holding the same track keeping its association, count and a working stream response, the four non-owner cases each answering `404`, and the missing client header.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
