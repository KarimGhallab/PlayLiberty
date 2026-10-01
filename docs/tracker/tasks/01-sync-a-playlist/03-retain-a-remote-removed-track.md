# 03: Retain a track whose source video is gone

**What to build:** A source video that disappears no longer takes the track with it. On the next sync, a video
absent from the source marks its track remote-removed: the file is retained, the track still plays, and the run
counts it as retained rather than removed. A track that left the source before its audio was ever fetched
becomes `unavailable` instead of sitting `pending` forever. Because the flag lives on the track, a video gone
from the source reads the same way in every playlist that holds the track.

**Blocked by:** 02.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A video absent from the source marks its track `sourceStatus: removed`, keeps its file, and increments the run's retained count.
- [x] The run's removed count stays zero.
- [x] A remote-removed stored track still streams.
- [x] A video that left the source before it was ever downloaded becomes `unavailable`, not `pending`, and is not queued.
- [x] A track associated with two playlists that leaves the source reads remote-removed in both.

## Outcome

Implemented and verified. The reconcile makes a second pass over the playlist's associations after it adds: a
video the source no longer lists has its track marked `sourceStatus: removed`. A stored track keeps its file
and increments the run's retained count; a track with no file becomes `unavailable`, so it is not claimed by
the download worker. The flag is written to the track, so every playlist holding it reads the same answer, and
`removedCount` stays zero. A stored remote-removed track still streams its file.

Two decisions worth naming. Only the stored case counts as retained, which follows the glossary, where
remote-removed is `stored` plus `removed` while an `unavailable` track is a different state, so a track that
left before it was downloaded adds nothing to the count. And a video that returns to the source does not clear
the flag on a retained track, because the reconcile leaves an associated video exactly as it is; restoring is
not in this ticket.

Verification: `pnpm run test` (76 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
