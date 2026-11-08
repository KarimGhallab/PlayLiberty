# 02: The cover sheet saves a chosen image

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The "arriving" placeholder is gone. The Cover item on the gallery and the detail opens `CoverSheet`, which shows
the playlist's cover in a square through the existing custom, first-track, sleeve chain, offers Choose image, and
asks for the photo library when it opens.

A chosen image is previewed in the square. The picker's JPEG rendition is refused before any request when its type
is not JPEG, PNG or WebP, or when it exceeds 5 MB, with one sentence and the sheet's state kept. Save is disabled
until an image is chosen; it reads the file through `expo-file-system` and sends its bytes as the raw body with the
asset's content type and no crop fields, so the server applies its centred square. The busy state blocks a second
press and every dismissal. A failed save keeps the sheet and the image.

A chosen image makes Cancel, the backdrop, the drag and back ask once. Remove appears only while a custom cover
exists, asks once inline, and on success the sheet stays open on the playlist's fallback cover. The setter writes the
answer into the playlist read and both commands ask the playlist and library reads again, so the detail and the
gallery follow without a manual refresh.

`usePlaylistCover` now accepts a null playlist, so the sheet can stay mounted while closed. The placeholder component
and the unused `playlistActions.arriving` key were deleted; `coverDialog.pickFailed` was added to both catalogues for
a picker that cannot open.

See [`29-set-a-playlist-cover`](../../specs/29-set-a-playlist-cover.md).
