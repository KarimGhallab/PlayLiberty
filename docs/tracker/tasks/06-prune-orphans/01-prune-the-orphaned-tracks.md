# 01: Prune the orphaned tracks

**What to build:** The disk is reclaimed after a listener drops the last reference to a track. The prune finds
tracks that no playlist associates any more, removes their audio and their thumbnail, and only then removes the
track, one transaction per track so a crash between the two is impossible. An orphan is a track with zero
associations and nothing else: a track with one association survives entirely, with its file intact, whatever
its file status and whatever its source status, including a remote-removed stored track that is still in a
playlist and a track held only through another account's playlist. A track that is currently downloading is
skipped, because the worker holds a file it is writing. A track whose media cannot be removed keeps its row and
its reason is logged, and a later run reclaims it once the file is gone. The return is the number of tracks
actually removed, and a run that finds nothing removes nothing and returns zero.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A track with no associations has its row, its audio file and its thumbnail removed.
- [x] A track with one association survives entirely, with its file intact, whatever its file status and whatever its source status.
- [x] A remote-removed stored track that is still in a playlist survives, and so does a track held only through another account's playlist.
- [x] A failed track with no associations is removed.
- [x] A downloading track is skipped and survives.
- [x] A track whose media cannot be removed keeps its row, logs the reason, and is removed on a later run once the file is gone.
- [x] Removing the last association to a track does not remove anything immediately, and the next run does.
- [x] A run that finds nothing removes nothing and returns zero.
- [x] The returned count equals the number of tracks actually gone.
- [x] A track that only a suppressed video would re-add is still an orphan, since suppression is not a reference.

## Outcome

Implemented and verified. `pruneOrphanTracks` selects the tracks with no association through a `not exists`
against `association`, and for each one removes its audio and its thumbnail, then its row, skipping
`downloading` and logging a warning when the media cannot go. The selection is the whole definition of an
orphan: a `not exists` means a track's state, its source status and the history of how it lost its playlist are
all irrelevant, and only a live association saves it.

Two details worth naming. `rm` uses `force: true`, so a file already gone is the state this wants rather than
an error, and the row is removed only after both the audio and the thumbnail are gone, so a failure leaves a
track a later run can finish rather than a row claiming a file that is not there. And the run is not yet
signalable: ticket 02 gives it the stop signal, and until then it finishes its whole scan.

The fourteen new tests cover the removal of the row, the audio and the thumbnail; a track that keeps one
association in each of four file states; a remote-removed stored track still in a playlist; a track held only
through another account's playlist; a failed orphan; a downloading track skipped; a run that finds nothing;
the count matching what went; the last association going without an immediate removal, with the next run
reclaiming it; a suppressed video not counting as a reference; and a media removal that fails under a
read-only directory, leaves the row, logs the reason, and succeeds on a later run once the directory is
writable again. The logger is a recording spy, so the warning assertion is about what was written rather than
about pino.

Three of the spec's operator clauses have no ticket of their own, as the cut agreed, and they already hold: the
cadence is `PRUNE_CRON` with a weekly default, `startCronJob` guards with `protect: true` and contains a
throwing tick, and the startup sweep remains the backstop in `onReady`. Nothing here changes them.

Verification: `pnpm run test` (211 server tests, 14 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs`, `pnpm run design:check` and a `tsc --noEmit`
over every test file pass. No migration, no em dashes. Not committed.
