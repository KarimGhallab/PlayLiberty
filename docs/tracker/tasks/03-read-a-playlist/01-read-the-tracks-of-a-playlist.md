# 01: Read the tracks of a playlist

**Status:** resolved

## Outcome

`GET /playlists/:id/tracks` answers a page of the playlist's associations, each item the track plus its
association's `origin` and `position`, validated by the page schema built over the existing playlist-track
schema. `listPlaylistTracksForAccount` reads access first, so a playlist the account cannot reach is the same
`404` the two playlist reads give, then joins `association` to `track` on `playlist_id` with `position` then the
qualified association `rowid` as the tiebreak. Membership is that one join, so a track held only by another
playlist never appears and a track held by two appears once. The total is the playlist's stored `trackCount`
rather than a second count query, and the mapping to the contract drops the two stored-only fields (`filePath`,
`thumbnailUrl`), which a client reaches through the track's own routes.

See [`03-read-a-playlist.md`](../../specs/03-read-a-playlist.md).
