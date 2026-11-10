# 33: One audience resolver

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`playlistAudiences(database, playlistIds)` in `playlistAccess.ts` is the one account-to-playlists grouping: one query for the whole batch, grouped by account, in the order the caller named the playlists, with the owner first. A missing playlist and an empty batch add nobody.

`playlistAudience` is now a single-playlist projection of it, and `trackAudience` reads the track's holding playlists once and projects them through the same resolver. `publishTracksChangedForPlaylists` calls the batch resolver once instead of calling `playlistAudience` per id, while `publishPlaylistChanged` and `publishTrackChanged` reach the resolver through their projections. The events each listener receives are unchanged.

`playlistAccess.test.ts` covers the batch grouping, the missing and empty cases, both projections, and one query for a three-playlist batch.
