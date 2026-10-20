# 10: One artwork pipeline, the cover reuses the track's thumbnail

**State:** `resolved`
**Category:** `enhancement`

## Outcome

**Superseded by [`14-upload-a-playlist-cover`](../specs/14-upload-a-playlist-cover.md) on the ownership rule:** a playlist now carries an optional custom cover, stored by the server, and this issue's first-track pipeline is its fallback. `PlaylistSchema` carries `coverTrackId`, resolved on read from the playlist's first association (batched for the list, single for the read), and the header renders the track's own thumbnail route when no custom cover exists, with the sleeve standing in for a missing or failed image. `cover_url` is gone from the column (the initial migration), the contract and the sync. The small derivative and its `?size=small` route were built and then dropped, because the ambience grounds draw the full image instead, so there is no downscale, no derivative file, and no `resizeThumbnail` in the adapter.
