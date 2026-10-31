# 103: Unpinning the last playlists leaves blank space in the pinned row

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None.

## Outcome

The gallery's pinned row now clamps its horizontal offset when its content shrinks. Unpinning a card while the row is scrolled keeps the old offset on Android, so the remaining cards stay shifted left and their former place reads as blank until the next scroll. `clampScrollOffset` returns the offset inside the new content, and the row applies it from `onContentSizeChange`, so the cards sit in their new place at once.

Verification: `clampScrollOffset` 4 tests, gallery 27 tests, mobile 243 tests across 33 suites, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass. On the emulator, with three pinned playlists and the row scrolled right, unpinning the last card returned the row to its start immediately instead of leaving the blank area.
