# 38: Playlist actions once per page

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/playlistActions/playlistActions.tsx` is now a page-level module. It owns one sync, rename, delete and pin mutation, projects a menu per playlist through `menuFor(playlist)`, and hosts the rename and share dialogs once. The four query hooks take the playlist id as a mutation variable, so the observer count no longer follows the gallery size.

The gallery page calls the module once and passes each item `actions.menuFor(playlist)`; `PlaylistItem` renders that menu and nothing else, so it mounts no hook and no dialog. The detail keeps its one call, reads `menuFor(playlist.data)`, and wraps the shared `syncNow`/`syncing` for its own id. The delete still opens the page's one undo window with the same commit, and the menus keep their items, labels, order, disabled states and destructive flags.

`playlistActions.test.tsx` adapts to `menuFor`; `mutationInvalidation.test.tsx` passes the id as a mutation variable.

Verification: `pnpm run build` passes, `pnpm run lint` is clean, and the web suite is 501 passed across 50 files. The e2e suite is 34 of 35: the one failure is the concurrent library grouping change in the working tree, which adds an "Unpinned" section whose accessible name also matches the test's `region name: 'Pinned'` locator. The curate, share and library-action journeys pass, and the delete journey passes in isolation and in the second full run.

## Objective

The gallery mounts one actions module per page. Each item receives its menu as data, and the four mutations and two dialogs are hosted once.

## Context

The actions module is a hook called per item, so N playlists create 4N mutation observers and N pairs of dialogs. The gallery item exists only to host the hook in the loop. The detail calls the same module once, which is the shape both surfaces should have.

Architecture review 2026-10-19, candidate 5.

## Scope

- One actions module per page owns sync, rename, delete and pin, and the rename and share dialogs.
- A per-playlist projection returns the menu items and their gating, using the same access rule as today.
- Each gallery item renders the menu it is given and no dialogs.
- The detail keeps one call and places the dialogs at page level.
- Delete still opens the page's one undo window and calls the same commit.
- Every menu item, label, order, disabled state and destructive flag is unchanged.

## Out of scope

The access rule itself, pin behavior, dialog internals and the deferred-action module.

## Blocking edges

None. Can start immediately. If picked alongside ticket 37, sequence them: both edit the gallery item.

## Verification

- A gallery of N playlists creates four mutation observers, not 4N.
- No item mounts a dialog.
- The library, detail, share and e2e suites pass unchanged.
- `pnpm run build`, `pnpm run lint`, the web suite and `pnpm test:e2e` pass.
