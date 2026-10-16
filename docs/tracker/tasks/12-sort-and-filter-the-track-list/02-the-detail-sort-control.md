# 02: The detail's sort control

**Status:** resolved

## Outcome

The detail's tracks column gained a control row above the list holding `PlaylistSortControl`: a menu button at the row's end that draws the order the playlist is read in and opens the three orders, with the lead space left for ticket `05`'s filter chips. The control is presentational and the page owns the write, exactly as the skip setting does: `useUpdateSort` saves the order optimistically (the playlist's own value moves at once and a failure puts it back), answers the updated playlist, and invalidates the playlist-scoped reads, because the saved order is the order the list and the queue are read in. A refusal reuses the page's setting notice. The control is disabled while the queue is this playlist and shuffled, and for a read collaborator, whose value it still is to read, and the menu never opens while disabled. The copy is new keys under the detail namespace, in both catalogs: `sortBy`, `sortPlaylist`, `sortNewest`, `sortOldest`.

See [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).
