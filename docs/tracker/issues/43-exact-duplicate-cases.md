# 43: Exact duplicate cases

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

The duplicate at `PlaylistDetailPage.test.tsx:686` is removed; `:609` remains as the owner for naming the playlist from the playlist read. The near-duplicates the scan flagged (`playerStore.test.ts:327`/`:335`, `PlayerAudio.test.tsx:70`/`:84`, `VolumeControl.test.tsx:123`/`:132`, the `TrackRow` scrim cluster) each exercise a different input or action and stay as boundary coverage. The web suite passes (40 files, 396 tests).
