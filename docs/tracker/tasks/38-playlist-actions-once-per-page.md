# Playlist actions once per page

Status: open
Labels: `enhancement`, `ready-for-agent`

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
