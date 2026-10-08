# Rename the manual sync route from /refresh to /sync

Status: resolved
Labels: `enhancement`

## Outcome

The manual route is `POST /playlists/:id/sync` and its message matches the sibling stubs; no caller, test or client built the old path. The route is described in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), and the empty state's trigger in [`empty-state.md`](../../design-system/components/empty-state.md) is now true rather than aspirational.

## Verification

`pnpm run lint` passes; no reference to the old `/refresh` path remains.
