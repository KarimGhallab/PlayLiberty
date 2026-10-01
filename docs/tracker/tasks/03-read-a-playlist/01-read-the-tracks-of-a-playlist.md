# 01: Read the tracks of a playlist

**What to build:** A listener opens a playlist and gets its tracks, each one the track plus where it came from
and where it sits. `GET /playlists/:id/tracks` answers a page of the playlist's associations in position order,
ordered with the insertion-order tiebreak the playlist list route already uses so two calls cannot swap rows
that share a position. Membership is the playlist's associations alone, so a track held by another playlist
never appears and a track held by this playlist and another appears once. The total is the playlist's track
count. A playlist the account cannot see answers `404`, never `403`; a playlist that has never synced, or
simply holds nothing, answers an empty page with a total of zero and a successful status rather than an error
or a placeholder track. The response is the existing page schema built over the existing playlist-track
schema, and the route is a read that changes nothing.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The route answers the playlist's associations in position order, each item a track with its association's origin and position, and the page validates against the page schema built over the playlist-track schema.
- [ ] Membership is the playlist's associations alone: a track held only by another playlist never appears, and a track held by this playlist and another appears once.
- [ ] Two associations sharing a position return in the same order across two calls.
- [ ] A playlist with no associations answers an empty page with a total of zero and a successful status, never a problem document and never a placeholder track.
- [ ] A playlist the account cannot see answers `404`, never `403`.
- [ ] Paging returns the requested window and the true total, and the last page is short rather than padded.
- [ ] The route is a read: it creates and mutates nothing, and needs no client header.
- [ ] The suite drives the real app over a temporary database through HTTP injection, seeding accounts, playlists, tracks and associations directly, and validates responses against the contract schemas.
