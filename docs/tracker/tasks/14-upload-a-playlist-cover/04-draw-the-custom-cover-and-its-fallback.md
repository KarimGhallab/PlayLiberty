# 04: Draw the custom cover and its fallback

**Status:** resolved

## Outcome

The shared header seam now chooses the cover in one place. When `coverUpdatedAt` is set it requests the custom
cover through the versioned media route; otherwise, or after the custom image fails, it uses the first-track
thumbnail; when that also fails it draws the sleeve. The failure state names the level that failed and resets
when either the cover version or the track id changes, so a replacement or a new first track retries the
image.

The row, card and tile arrangements and the detail ground all read the same cover and failure state. Header
tests cover the versioned custom source, the custom-to-track-to-sleeve fallback, the same chain in all three
arrangements and the ground, and both resets.

Verification: `pnpm run build` passes, the full unit suite passes (server 381, web 506), and lint reports only
the existing unused `CONTROL` warning in the phone journey.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
