# 02: Set and read a cover through the API

**Status:** resolved

## Outcome

The server now accepts a raw JPEG, PNG or WebP at `POST /playlists/:playlistId/cover` from the owner or a
write collaborator, and serves it at `GET /playlists/:playlistId/cover` to any reader. The route has an
image-only body parser capped at 5 MB and no multipart parser. `sharp` auto-orients the image, rejects a
non-image, an animated image and an image over 64 megapixels, caps the long edge at 1600px without enlarging,
strips metadata and writes WebP at quality 86.

Each upload writes an immutable `covers/<playlistId>-<token>.webp` through the temp directory and renames it
into place before the row records the path and a later `coverUpdatedAt`. The previous file is deleted only
after the row commits, best effort; a failed write leaves the previous row and file. The media route serves
the current file as `image/webp` with `private, max-age=2592000`, answers `cover_not_found` for a playlist
without a cover or a missing file, and `playlist_not_found` for an unreachable playlist. A successful upload
publishes one `playlist.changed` event to the read audience after the row carries the cover; a refusal
publishes none.

The nginx template admits 6 MB so the server answers an over-size upload, the E2E reset clears `covers/`, and
the server depends on `sharp@^0.35.5`. Route tests cover the three formats, orientation and metadata
stripping, the 1600px cap, replacement and old-file removal, the type, non-image, 5 MB and 64MP refusals
leaving the previous cover, the owner/write/read/stranger/missing matrix, the media headers, a missing cover
and missing file, the event, a failed write, and survival across sync, rename, skip and sort.

Verification: `pnpm run build` and the server container build pass, and `sharp` loads in the runtime image.
The full unit suite passes (server 375, web 498). Lint reports no errors; its warnings are in the concurrently
edited playlist-delete work and the existing phone journey.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
