# 03: Rename a playlist

**Status:** resolved

## Outcome

Implemented and verified. `PATCH /playlists/:id` renames for the owner and answers the renamed playlist, so a client needs no second read. `renamePlaylistForAccount` checks `isPlaylistOwner` first, so a write collaborator, a read collaborator, a stranger and a missing playlist all answer the same `404`, then updates the name and the updated timestamp and nothing else; `RenamePlaylistInputSchema` gained `.trim()`, so the name is trimmed before its one-to-two-hundred bound is checked and a name empty after trimming is refused with the same `400` the other input routes give. The six new tests cover the owner rename with a title stored trimmed, an all-whitespace name refused with the playlist unchanged, a name of two hundred and one characters refused, the four non-owner cases each answering `404` with the name untouched, a rename that leaves the source, cover, last-synced time and sync status alone, and the missing client header.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
