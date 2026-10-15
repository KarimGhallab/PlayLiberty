# 46: The detail pages and plays the whole playlist

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

Done. The detail pages its list in, plays the whole playlist, pins its header, and owns a failed start.

- **The whole-list route.** `GET /playlists/:id/queue` returns the playlist's whole association list in one
  response, every status, in position order with the rowid tiebreak, and `404` when the playlist is
  invisible. `listPlaylistQueueForAccount` is the service seam, and the client's `buildQueue` stays the one
  place playability is decided, so the route does not encode that rule a second time.
- **The list pages in.** `usePlaylistTracks` is an infinite read over the existing paginated tracks route at
  100 a page, flattened to one list plus a total. `LoadMoreControl` is the `IntersectionObserver` sentinel
  plus the accessible **Load more** button, and the button reads as the retry when a page fails.
- **Play covers the playlist, not the page.** The detail reads the whole list lazily (`usePlaylistQueue`,
  enabled while this playlist is the queue), and a play or a shuffle press awaits it through the query cache
  before it starts. `useQueueRefetch` is fed that read, so a live sync merges against the whole playable set
  rather than a page.
- **The library's shuffle covers the whole playlist too.** `useShufflePlaylist` reads the whole-list route,
  and an optional `onUnreachable` lets the detail put that failure on its own control while the library
  keeps its notice.
- **The count is a window.** The header reads `N of M tracks` while the list is partial and the standing
  total once it is whole.
- **The header stays.** The left column is sticky on the desk and the row header is sticky on a phone, and
  the column scrolls inside itself when it is taller than the viewport.
- **The failure lands on the control.** A failed queue read becomes the header's own red **Retry playback**
  with a sentence under the header, the shuffle steps aside, and the retry re-runs the press that failed.
  The hover is a darker failed tone, never the accent.

Prototype verdicts folded in: `/prototype/queue-failure` variant C (the control owns it) and
`/prototype/list-count` variant C (the header count). The pinned header was decided directly.

Verification: `pnpm test:unit` (817 tests across the workspaces), `pnpm run build` and `pnpm run lint` are
clean. The prototype routes are still uncommitted in the working tree; they are throwaway and should be
captured on a branch of their own and removed from main.
