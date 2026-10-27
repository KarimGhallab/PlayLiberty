# 100: The prune deletes a track only while it is still an orphan

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Observed

`pruneOrphanTracks` selects the orphan set once, then awaits media removal for each track before deleting the row. An association added after the select is invisible to the loop. When the loop reaches that track, it removes the media and deletes the row; the foreign-key cascade removes the new association. If the source is already gone, the track cannot be downloaded again.

## What to build

A track that gains an association while the weekly prune is running is never deleted, and its media stays. The orphan check and the row delete are one atomic decision. Media is removed only after the row delete succeeds, so a failed delete does not leave a row pointing at missing bytes. A genuinely orphaned track is still removed.

## Evidence

- `apps/server/src/features/prune/service/pruneService.ts:34-43,47-67,159-177`
- `apps/server/src/features/tracks/trackLifecycle/trackLifecycle.ts:276-278`
- `apps/server/src/platform/database/schema.ts:118-120`
- The existing prune test covers a track that stays orphaned; it does not interleave an association between the select and the delete.

## Acceptance criteria

- [ ] A track that gains an association after the orphan query is not deleted; its media remains.
- [ ] The orphan check and the row delete are atomic; a concurrent association cannot be cascaded away.
- [ ] Media is removed only when the row was actually deleted.
- [ ] A genuinely orphaned track is still removed.
- [ ] A test interleaves the association between the orphan query and the delete and proves the track survives.

## Agent Brief

- Replace the unconditional row delete with a conditional delete that requires no association at delete time.
- Use the delete result to decide whether to remove media.
- Keep the orphan check and delete in one transaction per track.
- Keep the existing skip for a track that is downloading.
- Add the interleaving test and keep the existing prune tests.

## Verification

- `pnpm --filter @playliberty/server test`
- `pnpm run build`
- `pnpm run lint:check`
