# 04: Draw the custom cover and its fallback

**Status:** ready-for-agent

## What to build

All three playlist header arrangements and the detail ground draw the custom cover when the playlist carries a
cover version. A failed custom image falls back to the first-track thumbnail, and a failed track thumbnail falls
back to the sleeve. The failure state resets when the cover version or the track changes. The custom image is
requested through the versioned cover media route.

This ticket makes a cover set through the API visible on every playlist surface before the editing dialog
exists.

## Blocked by

[`02`](02-set-and-read-a-cover-through-the-api.md).

## Acceptance criteria

- [ ] The header uses the versioned custom cover URL when `coverUpdatedAt` is set.
- [ ] A custom image that fails to load falls back to the first-track thumbnail, then to the sleeve.
- [ ] A playlist with no custom cover keeps the first-track cover, then the sleeve.
- [ ] The row, card and tile arrangements and the detail ground all use the same cover and fallback state.
- [ ] A new cover version or a new track id resets the failure state and retries the image.
- [ ] Header tests cover the custom source, both fallback steps and the reset.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
