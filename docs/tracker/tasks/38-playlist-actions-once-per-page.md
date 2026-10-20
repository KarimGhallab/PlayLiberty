# 38: Playlist actions once per page

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/playlistActions/playlistActions.tsx` is now a page-level module. It owns one sync, rename, delete and pin mutation, projects a menu per playlist through `menuFor(playlist)`, and hosts the rename and share dialogs once. The four query hooks take the playlist id as a mutation variable, so the observer count no longer follows the gallery size.

The gallery page calls the module once and passes each item `actions.menuFor(playlist)`; `PlaylistItem` renders that menu and nothing else, so it mounts no hook and no dialog. The detail keeps its one call, reads `menuFor(playlist.data)`, and wraps the shared `syncNow`/`syncing` for its own id. The delete still opens the page's one undo window with the same commit, and the menus keep their items, labels, order, disabled states and destructive flags.

`playlistActions.test.tsx` adapts to `menuFor`; `mutationInvalidation.test.tsx` passes the id as a mutation variable.

Verification: `pnpm run build` passes, `pnpm run lint` is clean, and the web suite is 501 passed across 50 files. The e2e suite is 34 of 35: the one failure is the concurrent library grouping change in the working tree, which adds an "Unpinned" section whose accessible name also matches the test's `region name: 'Pinned'` locator. The curate, share and library-action journeys pass, and the delete journey passes in isolation and in the second full run.

See [ARCHITECTURE.md](../../ARCHITECTURE.md).
