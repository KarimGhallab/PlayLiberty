# 01: Prune the orphaned tracks

**Status:** resolved

## Outcome

`pruneOrphanTracks` selects the tracks with no association through a `not exists` against `association`, and for
each one removes its audio and its thumbnail, then its row, skipping `downloading` and logging a warning when the
media cannot go. That selection is the whole definition of an orphan: only a live association saves a track, and
a track's state, its source status and the history of how it lost its playlist are all irrelevant. `rm` uses
`force: true`, so a file already gone is the state this wants rather than an error, and the row is removed only
after both the audio and the thumbnail are gone, so a failure leaves a track a later run can finish rather than a
row claiming a file that is not there. The cadence is `PRUNE_CRON` with a weekly default, `startCronJob` guards
with `protect: true` and contains a throwing tick, and the startup sweep remains the backstop in `onReady`.

See [`06-prune-orphans.md`](../../specs/06-prune-orphans.md).
