# 02: Stop a prune cleanly

**What to build:** A prune in flight stops when the server is asked to close, without leaving a track half
removed and without holding the shutdown open for the whole media store. The run is handed a signal and stops
claiming new tracks once it is set, so the tracks it has not reached are left for the next run or for the
startup sweep rather than being forced through; a track it is already deleting finishes that deletion. The close
hook sets the signal and stops the clock, so a shutdown during a cleanup leaves the instance converging on its
own.

**Blocked by:** [`01`](01-prune-the-orphaned-tracks.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The run accepts a signal and stops claiming new tracks once it is set, returning the count it completed.
- [x] A track already being removed when the signal arrives finishes its removal rather than being interrupted.
- [x] Every track the stopped run did not reach is still present, with its row and its media intact, for the next run.
- [x] The server's close hook signals a running prune and stops the job's clock.
- [x] A stopped run can be followed by a later run that removes what it left.

## Outcome

Implemented and verified. `pruneOrphanTracks` takes an optional `signal` and checks it between tracks, never
mid-deletion, so a track already being removed finishes and everything not reached is left with its row and
media intact. The check sits after the per-track order, which is what makes "finishes the removal in flight"
true rather than aspirational. The signal was the mechanism the cut agreed to add, so `startCronJob` now passes
an `AbortSignal` to `run` and `stop()` aborts it before stopping the clock; a fresh controller is created per
tick, so a stop only signals the run it was called during. `buildApp` forwards the signal into
`pruneOrphanTracks`. The close hook already called `scheduler.stop()`.

The four new tests cover a run whose signal is already set, which removes nothing; a run stopped mid-scan by a
warning-triggered abort, where the first track's failed media removal is the deterministic hook, the later
tracks survive, and a second run reclaims all three; and a scheduler test whose cron fires every second,
asserting a real tick drove the service to reclaim an orphan and that the close then resolves rather than
hanging on a run.

Two honest limits. The cron runner's own signal contract has no unit test: the signal is only observable
through a tick, and rather than contrive a clock the scheduler test exercises it through the real wiring, which
is stronger for the criterion the ticket states. And `stop()` is still synchronous, so the close does not wait
for a prune to finish; it signals it and returns, which is what "does not hold the shutdown open for the whole
media store" asks for.

Verification: `pnpm run test` (215 server tests, 4 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs`, `pnpm run design:check` and a `tsc --noEmit`
over every test file pass. No migration, no em dashes. Not committed.
