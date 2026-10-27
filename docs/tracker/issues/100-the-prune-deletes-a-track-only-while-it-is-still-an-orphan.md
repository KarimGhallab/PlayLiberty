# 100: The prune deletes a track only while it is still an orphan

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

The prune now deletes a track row with one conditional statement that requires no association at delete time, so an association added after the orphan scan keeps the track and its media. The row is deleted first, and the media only when that delete reports a change; a track that is still referenced is skipped with its bytes untouched. The downloading skip and the between-tracks abort check stay where they were.

A media removal that fails after the row is gone is logged and left, rather than keeping the row for a retry. The old order removed the bytes first, so a delete that then did not happen could leave a row pointing at missing media.

Verification: `pnpm --filter @playliberty/server test` (432), `pnpm run build`, and `pnpm run lint:check` all pass. The new test interleaves an association between the orphan scan and the second track's delete, through the warning of the first track's failed media removal, and proves the second track and its media survive. The existing prune tests were kept; the three that asserted the old remove-media-first order now assert the new delete-first contract.
