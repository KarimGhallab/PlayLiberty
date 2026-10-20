# 09: Amend the cover documents

**Status:** ready-for-agent

## What to build

Bring the product records in line with the custom playlist cover. The product capability list gains the custom
cover. The glossary defines the playlist cover and the custom cover, and the media store includes cover files.
The architecture records the covers directory, the stored cover file and the image normalisation boundary. The
design record states that a cover may be custom and keeps the custom, first-track, sleeve fallback. The old
artwork issues that state a playlist owns no image are marked as superseded or amended.

The documents must describe one consistent fallback chain and no longer claim that the first-track thumbnail is
the only playlist cover.

## Blocked by

None. Can start immediately.

## Acceptance criteria

- [ ] The product capability list names a custom playlist cover.
- [ ] The glossary defines the playlist cover, the custom cover and cover files in the media store.
- [ ] The architecture records the covers directory, the stored WebP and the server normalization boundary.
- [ ] The design record keeps the custom, first-track, sleeve fallback.
- [ ] The old "playlist owns no image" issues are superseded or amended.
- [ ] No document contradicts the custom cover or the fallback chain.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
