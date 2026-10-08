# 28: A track change tells a listener only about playlists it can see

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

Done. A track-change event is computed per recipient.

- `trackAudience` now returns a per-account answer, `{ accountId, playlistIds }[]`, listing only the holding playlists each account can reach. It previously returned the flat union of every holding playlist and every account that could see any of them.
- `publishTrackChanged` publishes one event per recipient, each carrying only that account's playlist ids.
- `publishTracksChangedForPlaylists` (the association-change path) builds the same per-recipient payload, so an account hears only the named playlists it can reach.
- `LiveEventSchema`'s `TrackChanged` shape is unchanged (an array of playlist ids), and every published array is non-empty by construction.

Verification: two new tests. One retries a track held by two playlists owned by different accounts, with a collaborator on one: the collaborator hears only its playlist, each owner hears its own, and a stranger hears nothing. The other adds a video to two owned playlists with a collaborator on one: the collaborator hears only its playlist, the owner hears both. Full unit suite exits 0 (server 318); `pnpm run build` and `pnpm run lint` clean.
