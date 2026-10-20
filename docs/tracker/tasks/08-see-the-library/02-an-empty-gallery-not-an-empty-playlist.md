# 02: An empty gallery, not an empty playlist

**Status:** resolved

## Outcome

`EmptyGallery` is a view-local component under `src/views/library/` that draws the heading `No playlists yet`, the promise as `.prose`, and a primary `Add a playlist` control with the `plus` glyph. `LibraryPage` now has four explicit states and no fifth: loading, a failed read, the empty gallery, and the populated list, with the failed read keeping its own `role="alert"` sentence so a broken read is never presented as an empty gallery. The gallery's action is `Add a playlist` and never `Sync now`, and the playlist empty state is not drawn anywhere on the library. The gallery's control is wired to a no-op placeholder on `LibraryPage` until the add-playlist dialog replaces it.

See [`08-see-the-library`](../../specs/08-see-the-library.md).
