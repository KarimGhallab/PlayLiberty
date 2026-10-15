# 01: The saved sort on a playlist

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `playlist.sort` is a nullable text column (migration `0001_marvelous_sage`), and
`null` is the playlist's own order, so a playlist that was never sorted carries no value. `PlaylistSort` is a
three-member enum in the contracts (`playlist`, `newest_first`, `oldest_first`); `PlaylistSchema` gained a
required `sort`, so every read carries the value the client's control draws, and `SortPlaylistInputSchema` is
the mutation's body.

Both reads order by the saved value through one helper. The playlist's own order is `position, rowid`, and a
date sort puts the association's `added_at` first with the same two as the tiebreak, so a sync that adds many
rows in one instant still reads in the playlist's own order. The queue read reads the playlist row for the sort
and answers in the same order as the list read. The sort key stays server-side: `added_at` is never surfaced on
the wire and never drawn, and the row keeps its shape.

`updateSortForAccount` and `PATCH /playlists/:id/sort` mirror the skip-non-music setting: write access (the
owner or a write collaborator, with a read collaborator, a stranger and a missing playlist all answering one
`404`), a validated body, the updated playlist in the reply, and a republished playlist-changed event, which
asks another client of the playlist for its playlist and its tracks again. The playlist's own order is stored as
the absence rather than a stored member of the enum.

The corpus statement this falsified is amended: the `03-read-a-playlist` out-of-scope line now points at
[`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).

The tests: the routes suite gained a describe for the order the tracks are read in (the playlist's own order
with no value saved; newest first and oldest first after the value is saved; the position tiebreak within one
timestamp; the queue read matching the list read) and a describe for the mutation (the owner saves and the
column holds it; the playlist's own order is stored as null; a write collaborator may and a read collaborator is
refused; a stranger and a missing playlist answer `404`; an unknown value is a validation failure; a missing
client header is refused). The fixtures gained a `sort` option on `seedPlaylist` and an `addedAt` option on
`associate`, because a date sort needs dates the column's own default cannot give it.

The contract field is required, so the web fixtures that build a `Playlist` literal or a playlist response
gained `sort`, exactly as they gained `skipNonMusic` before it.

Verification: `pnpm test:unit` (server 354, web 396), `pnpm run build`, `pnpm run lint`, the e2e typecheck and
prettier pass. No em dashes. Not committed.
