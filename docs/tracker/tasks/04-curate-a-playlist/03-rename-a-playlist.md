# 03: Rename a playlist

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `PATCH /playlists/:id` renames for the owner and answers the renamed playlist, so a
client needs no second read. `renamePlaylistForAccount` checks `isPlaylistOwner` first, so a write
collaborator, a read collaborator, a stranger and a missing playlist all answer the same `404`, then updates
the name and the updated timestamp and nothing else. `RenamePlaylistInputSchema` gained `.trim()`, so the name
is trimmed before its one-to-two-hundred bound is checked and a name that is empty after trimming is refused
with the same `400` the other input routes give.

The six new tests cover the owner rename with a title stored trimmed, an all-whitespace name refused with the
playlist unchanged, a name of two hundred and one characters refused, the four non-owner cases each answering
`404` with the name untouched, a rename that changes only the name and the updated timestamp while the source,
cover, last-synced time and sync status stay put, and the missing client header.

Verification: `pnpm run test` (150 server tests, 6 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` pass. No
migration, no em dashes. Not committed.
