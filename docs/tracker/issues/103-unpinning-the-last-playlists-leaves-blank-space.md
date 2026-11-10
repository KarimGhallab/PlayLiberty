# 103: Unpinning the last playlists leaves blank space in the pinned row

**State:** `resolved`
**Category:** `bug`

## Outcome

The gallery's pinned row now clamps its horizontal offset when its content shrinks. Unpinning a card while the row is scrolled keeps the old offset on Android, so the remaining cards stay shifted left and their former place reads as blank until the next scroll. `clampScrollOffset` returns the offset inside the new content, and the row applies it from `onContentSizeChange`, so the cards sit in their new place at once.

On the emulator, with three pinned playlists and the row scrolled right, unpinning the last card returned the row to its start immediately instead of leaving the blank area.
