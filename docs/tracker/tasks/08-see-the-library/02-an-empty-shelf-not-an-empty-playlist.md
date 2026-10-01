# 02: An empty shelf, not an empty playlist

**What to build:** A listener with no playlists at all is told so and offered the one action that helps: an
empty shelf whose action is "Add a playlist". It is a different state from a playlist that exists but has never
synced, whose own empty state says "Sync now" because the playlist is there and has not been synced. The two
never coexist: the library shows the shelf only when the account has no playlists, and never draws the
playlist's empty state.

**Blocked by:** [`01`](01-the-list-and-the-item.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An account with no playlists renders the empty shelf and its "Add a playlist" action.
- [ ] The empty shelf is not the playlist's empty state, and its action is not "Sync now".
- [ ] The library never draws the playlist's empty state.
- [ ] A playlist that exists but has never synced is a different state from having no playlists.
- [ ] A failed list read renders the library's own error state, not the empty shelf.
