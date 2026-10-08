# 34: One writability rule

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The owner-or-write predicate is computed in the playlist-actions module and again in the detail page for the writable set, so one access rule has two implementations that must agree.

**Current behavior:**
`usePlaylistActions` exposes `canWrite` as `access === 'owner' || access === 'write'` and uses it to gate the menu. `PlaylistDetailPage` re-computes the same predicate to filter the playlists the add dialog may offer, and re-threads `canWrite` through its edit, retry, sync and remove controls. A change to the rule has to be made in both places, and the menu and the writable set can drift.

**Desired behavior:**
The actions module owns the predicate and exports it, or a list-level selector that filters playlists to the writable ones. The hook and the detail consume it, so the rule lives in one module and the two surfaces cannot disagree. The observable behaviour is unchanged.

**Key interfaces:**

- One exported predicate `canWrite(playlist)` (owner or write collaborator), or an equivalent list selector.
- `usePlaylistActions.canWrite` derives from it; the detail's writable set derives from it.
- A playlist that has not loaded still answers not-writable, as today.

**Acceptance criteria:**

- [x] `owner || write` is written once and consumed by the actions module and the detail.
- [x] The writable set the add dialog offers and the menu gating derive from the same predicate.
- [x] The observable behaviour (which account sees which menu item, which playlists the dialog offers) is unchanged.
- [x] A test covers the predicate; the existing actions and detail tests keep passing.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The share dialog and its own access rules.
- The server-side access seam (issue 22).
- The menu's contents.

## Observed

- `usePlaylistActions` computes `canWrite`.
- `PlaylistDetailPage` re-computes the same predicate for `writablePlaylists`.

## Expected

One predicate, exported and consumed by both.

## Outcome

Done. The writability rule lives once, in the actions module.

- `canWritePlaylist(playlist)` is exported from `apps/web/src/shared/playlistActions/playlistActions.tsx` and is the only place `owner || write` is written. It answers `false` for an unloaded playlist, as before.
- `usePlaylistActions.canWrite` derives from it, so the menu gating and the detail's `canWrite` share the rule.
- `PlaylistDetailPage`'s `writablePlaylists` filters the library list through the same predicate, so the add dialog's offer and the menu cannot disagree.

Observable behaviour is unchanged: owner and write see the add control and the write lane, a read collaborator sees neither, and the dialog offers only the playlists the account can write.

Verification: two new tests cover the predicate directly (owner and write true; read and unloaded false). The existing actions and detail suites pass. `pnpm run build` and `pnpm run lint` clean; unit suites exit 0 (web 398, server 330, youtube 31, i18n 39, tokens 3, ui-foundation 6).

## Evidence

- `apps/web/src/shared/playlistActions/playlistActions.tsx:86-87,186`.
- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:239,255-257`.
- Architecture review 2026-10-08, candidate 3.
