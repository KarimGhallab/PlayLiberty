# 03: Remove a cover through the API

**Status:** resolved

## Outcome

`DELETE /playlists/:playlistId/cover` is declared in the contract table and served by `removePlaylistCoverForAccount`. The entry seam resolves the playlist at the write need, so the owner and a write collaborator succeed while a read collaborator, a stranger and a missing playlist all answer the same `playlist_not_found`. The delete clears `coverPath` and `coverUpdatedAt` in one update, removes the stored file after the row commits as a best effort, and announces one `playlist.changed` to the read audience. A playlist with no cover answers 204 without writing or announcing, and a failed file unlink leaves the file for the weekly sweep without failing the request.

Route tests cover the owner and write success with the first track returned by the next read, the read/stranger/missing refusals leaving the cover and publishing nothing, the idempotent double delete, the event after the row is cleared, and a read-only covers directory still answering 204 while leaving the file.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
