# 01: The saved sort on a playlist

**Status:** resolved

## Outcome

`playlist.sort` is a nullable text column (migration `0001_marvelous_sage`), and `null` is the playlist's own order, so a playlist that was never sorted carries no value. `PlaylistSort` is a three-member enum in the contracts (`playlist`, `newest_first`, `oldest_first`), `PlaylistSchema` gained a required `sort`, and `SortPlaylistInputSchema` is the mutation's body. Both reads order by the saved value through one helper: the playlist's own order is `position, rowid`, and a date sort puts the association's `added_at` first with the same two as the tiebreak, so a sync that adds many rows in one instant still reads in the playlist's own order and the queue read answers in the same order as the list read. `updateSortForAccount` and `PATCH /playlists/:id/sort` mirror the skip-non-music setting: write access (the owner or a write collaborator, with a read collaborator, a stranger and a missing playlist all answering one `404`), a validated body, the updated playlist in the reply, and a republished playlist-changed event, with the playlist's own order stored as the absence rather than a stored member of the enum.

See [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).
