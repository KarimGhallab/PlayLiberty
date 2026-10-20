# 02: Stop a prune cleanly

**Status:** resolved

## Outcome

`pruneOrphanTracks` takes an optional `signal` and checks it between tracks, never mid-deletion, so a track
already being removed finishes and everything not reached is left with its row and media intact. `startCronJob`
now passes an `AbortSignal` to `run` and `stop()` aborts it before stopping the clock, with a fresh controller
created per tick, so a stop only signals the run it was called during; `buildApp` forwards the signal into
`pruneOrphanTracks`, and the close hook already called `scheduler.stop()`. `stop()` is still synchronous, so the
close does not wait for a prune to finish: it signals it and returns.

See [`06-prune-orphans.md`](../../specs/06-prune-orphans.md).
