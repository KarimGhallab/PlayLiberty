# 03: Treat a video that is gone as terminal

**What to build:** When a video has been deleted, the download stops rather than hammering it. The adapter
signals that a video is unavailable distinctly from a transient failure, and the worker classifies it the way
the sync does: the track becomes `sourceStatus: removed`, and `fileStatus: unavailable` when there is no stored
file, while a track that already has a file keeps it and only its source status moves. A gone track is never
retried.

**Blocked by:** 01.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The adapter distinguishes a video that is gone from a transient failure.
- [x] A download that finds the video gone sets `sourceStatus: removed` and, with no file, `fileStatus: unavailable`.
- [x] A stored track keeps its file when its video turns out to be gone.
- [x] A gone track is not retried by a later download pass or sync.

## Outcome

Implemented and verified. The adapter now tells a gone video from a transient failure: `packages/youtube`
gains a `YoutubeVideoUnavailableError` and a message classifier, and the download throws the typed error when
yt-dlp reports the video unavailable rather than a rate limit or a dropped connection. The classifier and the
error are covered by the adapter's own tests, and the phrases stay behind the adapter so the worker never
matches tool output.

Both paths that meet a gone video now share one rule, `markTrackSourceRemoved`: it sets `sourceStatus: removed`
and, for a track with no stored file, `fileStatus: unavailable`, while a stored track keeps its file and only
its source status moves. The sync's retention pass was refactored onto it and the download worker calls it, so
a video that disappears between syncs and a download that finds it already gone produce the same pair of
values.

A gone track is terminal. `unavailable` is not `pending`, so a later pass never claims it, and the sync's retry
only returns `failed` tracks to `pending`, so a sync leaves it alone; both halves are tested.

Verification: `pnpm run test` (100 server tests, 3 new; 20 youtube tests, one new file), `pnpm run build`,
`pnpm run lint`, `npx depcruise .`, `npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and
`pnpm run design:check` pass. `pnpm run script:unused-code` still reports its pre-existing unused exports in
files this ticket does not touch.
