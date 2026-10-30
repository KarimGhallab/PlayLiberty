# 09: The sync band

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## What to build

Under the identity block, the sync band draws the latest run's counts for kept, added, removed and failed, the
last-sync stamp and, while a run is active, the count of tracks downloading. Zero cells are hidden; a run that
changed nothing says so; a running run says it is syncing.

A failed sync replaces the summary. The band says the provider could not be reached, reassures with the track count
when there is one, and puts the server's raw error behind a Show details control, shown as-is and never translated.
A write collaborator gets a retry beside the failure. Retry failed is drawn when failed tracks exist; it retries the
failed set and reports its in-flight state.

A read collaborator sees the band and its counts without either retry.

## Acceptance criteria

- [ ] The band draws the run's kept, added, removed and failed counts, the stamp and the downloading line.
- [ ] A run that changed nothing says so; zero cells are hidden.
- [ ] A failed sync replaces the summary with the provider sentence, the track count and the raw error behind Show
      details.
- [ ] Retry and Retry failed are drawn only for a write collaborator and report their in-flight state.
- [ ] A read collaborator sees no retry.
- [ ] The band and its disclosures render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the band's and detail's Jest files, then `pnpm run build` and
`pnpm run lint:check`.
