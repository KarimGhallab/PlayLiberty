# 05: A failed sync changes nothing

**Blocked by:** 03.
**Status:** resolved

## Outcome

Verified, with no production change. The failure branch shipped with ticket 01: the reconcile reads the source
first, and if that read throws, the catch marks the run `failed` with the adapter's message, sets `finishedAt`,
and moves the playlist to `error` with a last-synced time. Because the read is the first thing the reconcile
does, a failure creates no association, marks no track remote-removed and moves no position before it throws.

Three tests pin the guarantees: the failed run's status, error and zero counts alongside the unchanged rows and
positions; a later sync that reconciles normally; and a failure followed by an empty but successful reading,
which shows the two are not confused, since the empty source retires the track while the failure leaves it
alone.

Verification: `pnpm run test` (82 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
