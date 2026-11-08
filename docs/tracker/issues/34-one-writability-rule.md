# 34: One writability rule

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The writability rule lives once, in the actions module. `canWritePlaylist(playlist)` is exported from `apps/web/src/shared/playlistActions/playlistActions.tsx` and is the only place `owner || write` is written, answering `false` for an unloaded playlist as before. `usePlaylistActions.canWrite` derives from it, so the menu gating and the detail's `canWrite` share the rule, and `PlaylistDetailPage`'s `writablePlaylists` filters the library list through the same predicate, so the add dialog's offer and the menu cannot disagree. Observable behaviour is unchanged: owner and write see the add control and the write lane, a read collaborator sees neither, and the dialog offers only the playlists the account can write.
