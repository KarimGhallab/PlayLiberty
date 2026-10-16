# 02: Stop a prune cleanly

**Blocked by:** [`01`](01-prune-the-orphaned-tracks.md).
**Status:** resolved

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
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and a `tsc --noEmit`
over every test file pass. No migration, no em dashes. Not committed.
