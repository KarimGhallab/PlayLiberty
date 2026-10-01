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

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The route answers the playlist's associations in position order, each item a track with its association's origin and position, and the page validates against the page schema built over the playlist-track schema.
- [x] Membership is the playlist's associations alone: a track held only by another playlist never appears, and a track held by this playlist and another appears once.
- [x] Two associations sharing a position return in the same order across two calls.
- [x] A playlist with no associations answers an empty page with a total of zero and a successful status, never a problem document and never a placeholder track.
- [x] A playlist the account cannot see answers `404`, never `403`.
- [x] Paging returns the requested window and the true total, and the last page is short rather than padded.
- [x] The route is a read: it creates and mutates nothing, and needs no client header.
- [x] The suite drives the real app over a temporary database through HTTP injection, seeding accounts, playlists, tracks and associations directly, and validates responses against the contract schemas.

## Outcome

Implemented and verified. `GET /playlists/:id/tracks` answers a page of the playlist's associations, each item
the track plus its association's `origin` and `position`, validated by the page schema built over the existing
playlist-track schema. `listPlaylistTracksForAccount` reads access first, so a playlist the account cannot
reach is the same `404` the two playlist reads give, then joins `association` to `track` on `playlist_id` with
`position` then the qualified association `rowid` as the tiebreak, the list route's own tiebreak for its own
reason. Membership is that one join, so a track held only by another playlist never appears and a track held by
two appears once. The total is the playlist's stored `trackCount` rather than a second count query, and the
mapping to the contract drops the two stored-only fields (`filePath`, `thumbnailUrl`), which a client reaches
through the track's own routes.

The ten new tests in the playlist route suite cover position ordering, cross-playlist isolation, dedup, tie
stability across two calls, the empty page, the two `404`s, the requested window with a short last page, the
read-only property, and the invalid query string. The read-only test scopes its assertion to the playlist's
tables, because the identity hook upserts the account on every request and that write is not this route's.

Verification: `pnpm run test` (118 server tests, 10 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No contract
change, no migration, no em dashes.
