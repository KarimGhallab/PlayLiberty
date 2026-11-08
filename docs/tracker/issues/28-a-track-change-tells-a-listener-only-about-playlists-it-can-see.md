# 28: A track change tells a listener only about playlists it can see

**State:** `resolved`
**Category:** `bug`

## Outcome

A track-change event is computed per recipient. `trackAudience` now returns a per-account answer, `{ accountId, playlistIds }[]`, listing only the holding playlists each account can reach, where it previously returned the flat union of every holding playlist and every account that could see any of them. `publishTrackChanged` publishes one event per recipient, each carrying only that account's playlist ids, and `publishTracksChangedForPlaylists` (the association-change path) builds the same per-recipient payload, so an account hears only the named playlists it can reach. `LiveEventSchema`'s `TrackChanged` shape is unchanged (an array of playlist ids), and every published array is non-empty by construction.
