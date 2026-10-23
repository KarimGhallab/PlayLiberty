# 01: Store every new cover as a centered square

**Status:** resolved

## Outcome

`POST /playlists/:playlistId/cover` accepts four optional query fields, `cropX`, `cropY`,
`cropWidth` and `cropHeight`, as fractions of the displayed image. They are all-or-none and must
describe a non-empty region inside `0..1`; a partial, non-numeric, zero-area or out-of-bounds set
answers `422 unprocessable_request` before the cover is touched. With no fields the pipeline keeps
the centered square of the auto-oriented image, and with fields it keeps exactly that region, so the
crop is measured after the EXIF quarter turn. The region is capped at 1600px on its long edge without
enlargement and written as WebP at the existing quality. The body limit, accepted types, access rule,
versioning, old-file delete, event and prune behaviour are unchanged, existing covers are served
byte-identical, and no schema or migration was added.

See [`17-crop-a-playlist-cover.md`](../../specs/17-crop-a-playlist-cover.md).
