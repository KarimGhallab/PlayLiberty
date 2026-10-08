# 34: One writability rule

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The writability rule lives once, in the actions module.

- `canWritePlaylist(playlist)` is exported from `apps/web/src/shared/playlistActions/playlistActions.tsx` and is the only place `owner || write` is written. It answers `false` for an unloaded playlist, as before.
- `usePlaylistActions.canWrite` derives from it, so the menu gating and the detail's `canWrite` share the rule.
- `PlaylistDetailPage`'s `writablePlaylists` filters the library list through the same predicate, so the add dialog's offer and the menu cannot disagree.

Observable behaviour is unchanged: owner and write see the add control and the write lane, a read collaborator sees neither, and the dialog offers only the playlists the account can write.

Verification: two new tests cover the predicate directly (owner and write true; read and unloaded false). The existing actions and detail suites pass. `pnpm run build` and `pnpm run lint` clean; unit suites exit 0 (web 398, server 330, youtube 31, i18n 39, tokens 3, ui-foundation 6).
