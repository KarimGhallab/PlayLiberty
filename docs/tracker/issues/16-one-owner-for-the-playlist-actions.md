# 16: One owner for the playlist actions

**State:** `resolved`
**Category:** `enhancement`

## Outcome

A playlist's actions have one owner, and the header no longer derives the rule. A new `usePlaylistActions(playlistId, playlist, options)` module owns the owner/writer rule, the menu model it produces, the rename and share dialogs, and the sync, rename and delete mutations, returning `menu`, `dialogs`, the shared `syncNow`/`syncing`, and `canWrite`. `PlaylistHeader` now takes `menu` and no longer takes `onSync`, `onRename`, `onShare`, `onDelete` or `syncing`, while `PlaylistListItem` and `PlaylistDetailPage` both call the module and neither derives the rule nor wires the effects. What stays with the consumer is what genuinely differs, the library's one undo window and the detail's navigate-home on a committed delete, taken as `defer`, `deleteMessage` and `onDeleted`.
