# 05: Run only a few downloads at a time

**What to build:** The instance stays responsive and does not hammer the source. The worker runs no more than
the configured number of downloads at once, claimed in one batch per pass, so a backlog larger than the cap is
worked through across passes rather than all at once.

**Blocked by:** 01.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] No more downloads run at once than the configured concurrency.
- [x] A pass with more pending tracks than the cap leaves the rest for the next pass.

## Outcome

Implemented and verified. A pass now claims at most the configured number of tracks: it picks the oldest
pending rows up to the cap and moves them to `downloading` in one conditional update that returns only the
rows it moved, then downloads the whole batch at once. Because the batch is capped, running it in parallel is
the cap, so no pass has more than the configured downloads in flight. A backlog larger than the cap is worked
through on the following pass, oldest first.

The worker reads the cap from `config.download.concurrency`, and a pass takes it as an argument, so a test
drives a pass with any cap. The fake adapter yields inside each download, which is what makes a cap above one
observable rather than theoretical.

Verification: `pnpm run test` (105 server tests, 2 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
