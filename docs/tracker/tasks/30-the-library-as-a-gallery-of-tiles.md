# 30: The library as a gallery of tiles

**Blocked by:** None.
**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The library is a gallery of cover tiles. Every tile carries what the row carried, plus a mark that says how
much of the playlist is not on disk, and the counts that mark is drawn from travel on the list the gallery
already reads. The prototype that settled the design is not on `main`: its four arrangements are recorded
in [`library.md`](../../design-system/screens/library.md), which owns the decision, its figures and the
reason the tile won, and the prototype itself belongs on a throwaway branch.

**The tile is the header's third arrangement.** [`PlaylistTileHeader.tsx`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistTileHeader.tsx)
composes the same seam the row and the card compose, so the three cannot drift on the name, the share mark,
the count, the sync line with its elapsed time or the owner line, and it takes exactly the props it honours:
no play, no transport and no retry, because the library cannot offer them. Its rules are in
[`PlaylistHeader.module.scss`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.module.scss)
beside the other two arrangements, which is where the sleeve, the no-artwork hatch, the state ring and the
equalizer strip already live, so the tile added no copy of any of them. The door rule the row and the tile
share moved to [`playlistDoor.ts`](../../../apps/web/src/shared/components/PlaylistHeader/playlistDoor.ts).

**The item wires it.** [`PlaylistItem.tsx`](../../../apps/web/src/views/library/PlaylistItem.tsx) is
[`PlaylistListItem`](../../../apps/web/src/views/library/PlaylistItem.tsx)'s replacement and the reason it
exists: the actions module is a hook and a hook cannot be called in a loop. It hands the page one deferred
delete and passes the library's own mark into the header, which is why the mark takes a slot rather than
belonging to the header.

**The grid is the page's.** `repeat(auto-fill, minmax(232px, 1fr))` with `--space-4` gaps in
[`LibraryPage.module.scss`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.module.scss), four
columns at 1056 and one fewer at a time below, so no second rule. The list's closing hairline and its
per-item rules are gone: a grid has no rule to close. The mark costs no height, because it takes the leading
space of the actions row, so a tile is 396px with it and without it.

**The mark is a component of the library's own.**
[`IncompleteBadge.tsx`](../../../apps/web/src/views/library/IncompleteBadge/IncompleteBadge.tsx) is
presentational and reads nothing: one pill carrying the count of tracks whose file is not stored, toned by
the worst reason present (`failed`, then `unavailable`, then `downloading`, then `pending`), with the
breakdown of non-zero reasons on hover and on focus and the same breakdown in its `aria-label`, because the
mark is a `role="img"` whose children are not read out. It draws nothing when every track is stored and
nothing when its counts are null. One pill however many reasons are missing.

**The counts are on the list, which is what made the mark affordable.** `PlaylistSchema` gains
[`PlaylistWithCountsSchema`](../../../packages/contracts/src/schemas.ts), the playlist plus the file-status
counts of its associations, and the playlists page answers with it.
[`fileStatusCountsByPlaylist`](../../../apps/server/src/features/playlists/playlistService.ts) computes them
for the whole page in one grouped query, so the gallery asks once however many playlists it holds: the
prototype's one request per tile is gone, and the statement-count test that forbids an N+1 still passes. The
counts are over the whole playlist and never the page's rows, and their sum is the playlist's own
`trackCount`. The detail's chip row reads the same counts through the same function.

**The skeleton holds the gallery's shape.** [`LibrarySkeleton.tsx`](../../../apps/web/src/views/library/LibrarySkeleton/LibrarySkeleton.tsx)
draws eight tiles in the same grid, a square cover and the three lines the tile draws, so the read resolves
into the space the skeleton held.

**The copy is the library's.** `library.notDownloaded` is the mark's sentence in both catalogs, and the
`prototype.*` namespace is gone with the switcher. The word is the state's own: the glossary's
`Track.fileStatus` says `stored`, so the mark says "not stored" and never "missing". A track whose source
video was removed is deliberately not a reason, because a stored file whose video is gone is stored.

**The design is recorded.** [`library.md`](../../design-system/screens/library.md) now names the tile as the
web item, gives its figures (252x396px, four columns, 103px per item against the row's 152px, the name's
column at about 190px), says which client owns which width now that the web draws a grid of its own and
different from the mobile card, records the mark as something the item carries and why the play is still
absent, corrects the claim that the gallery shows no playing mark, and redraws the loading state as the
gallery's shape. [`playlist-header.md`](../../design-system/components/playlist-header.md) owns three
arrangements where it owned two, and [`DESIGN.md`](../../DESIGN.md) points at the tile.

**The tests are the behaviours.** [`IncompleteBadge.test.tsx`](../../../apps/web/src/views/library/IncompleteBadge/IncompleteBadge.test.tsx)
is the mark's owner: one pill for several reasons, the sum, the worst-reason tone across all four, the rows
of the breakdown, the singular and the plural, silence at zero and silence without counts, and axe. The tile
arrangement's section in
[`PlaylistHeader.test.tsx`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.test.tsx)
covers the facts it composes, the owner line, the absence of a play, the mark slot, the door with its
controls carved out, the pending dim, and the playing state the emphasis line is drawn from. [`LibraryPage.test.tsx`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.test.tsx)
is the assembly test: a tile per playlist, and the marks drawn from the counts the list read carries.
[`playlistRoutes.test.ts`](../../../apps/server/src/features/playlists/routes/playlistRoutes.test.ts) holds
the counts to the playlist rather than the page, and every list assertion in it now parses the counts too.
The journey is [`library.spec.ts`](../../../e2e/tests/library.spec.ts): a gallery is read, a playlist whose
tracks are not all stored shows one mark, the mark names what is missing on hover, and the tile still opens
its playlist.

Verification: `pnpm test:unit` (web 438, server 360, packages 79), `pnpm test:e2e` (29), `pnpm run build`,
`pnpm run lint`, `pnpm run design:check` and prettier pass. No em dashes. Not committed.
