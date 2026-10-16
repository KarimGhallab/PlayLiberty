# 46: The detail pages and plays the whole playlist

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

The detail pages its list in, plays the whole playlist, pins its header, and owns a failed start. `GET /playlists/:id/queue` returns the playlist's whole association list in one response, every status, in position order with the rowid tiebreak, and `404` when the playlist is invisible; `listPlaylistQueueForAccount` is the service seam, and the client's `buildQueue` stays the one place playability is decided, so the route does not encode that rule a second time. `usePlaylistTracks` is an infinite read over the existing paginated tracks route at 100 a page, flattened to one list plus a total, with `LoadMoreControl` as the `IntersectionObserver` sentinel plus the accessible Load more button that reads as the retry when a page fails, and the header reads `N of M tracks` while the list is partial and the standing total once it is whole. Play and shuffle cover the whole list, not the page: the detail reads it lazily (`usePlaylistQueue`, `useShufflePlaylist`), awaits it through the query cache before starting, feeds `useQueueRefetch` so a live sync merges against the whole playable set, keeps the header sticky (the left column on the desk, the row header on a phone, scrolling inside itself when taller than the viewport), and puts a failed queue read on the header's own red Retry playback with the shuffle stepping aside and the retry re-running the press that failed.
