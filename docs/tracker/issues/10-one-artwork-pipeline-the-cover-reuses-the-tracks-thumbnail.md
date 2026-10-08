# 10: One artwork pipeline, the cover reuses the track's thumbnail

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Implemented. The playlist owns no image: `PlaylistSchema` carries `coverTrackId`, resolved on read from
the playlist's first association (batched for the list, single for the read), and the header renders the
track's own thumbnail route with the sleeve standing in for a missing or failed image. `cover_url` is gone
from the column (the initial migration), the contract and the sync.

The small derivative and its `?size=small` route were built and then dropped: the ambience grounds draw
the full image instead, so there is no downscale, no derivative file, and no `resizeThumbnail` in the
adapter.

Verified: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 347).
