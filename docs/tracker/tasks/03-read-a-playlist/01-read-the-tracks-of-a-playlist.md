# 01: Read the tracks of a playlist

**Blocked by:** None. Can start immediately.
**Status:** resolved

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
