# 01: Recover interrupted syncs at boot

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

When the server becomes ready, it repairs the state a stopped process left behind. In one transaction, every sync run still marked running becomes failed with a finished time and the sentence "The sync was interrupted by a server restart.", and every playlist still marked syncing becomes error. The repair runs before the download worker starts and also when background jobs are disabled.

The repair leaves lastSyncedAt, associations, tracks, track files, media and downloads unchanged. It publishes no event; the existing ready invalidation covers clients that reconnect. The existing playlist detail already shows a failed latest run and a retry control, and the gallery already treats an error playlist as syncable, so the user can retry immediately.

## Acceptance criteria

- [ ] Booting with a running run and a syncing playlist yields a failed run with the interruption sentence and a finished time, an error playlist, and a sync request that is accepted.
- [ ] A syncing playlist with no running run is repaired, and a running run on an idle playlist is repaired.
- [ ] A boot with no stale rows changes no playlist and no run.
- [ ] The repair runs when background jobs are disabled.
- [ ] lastSyncedAt, associations, tracks, track files, media and downloads are unchanged.
- [ ] A second boot with no stale rows changes nothing observable.
- [ ] No live event is published by the repair.

## Verification

Run the server suite, then the repository build and lint checks: `pnpm --filter @playliberty/server test`, `pnpm run build`, `pnpm run lint:check`.

## Outcome

App readiness runs `recoverInterruptedSyncs` from `features/sync/services/recoveryService.ts` after the startup sweep and before the background-job gate, so it runs with jobs disabled too. One transaction fails every `running` run with `finishedAt` and "The sync was interrupted by a server restart." and errors every `syncing` playlist with `updatedAt`; the updates are independent, so an orphan on either side is repaired. `lastSyncedAt`, associations, tracks, files, media and downloads are untouched, and no event is published. Four app-over-SQLite tests rebuild the app over the same database and cover the assembly, the two orphan sides, the clean boot, the idempotent second boot, the untouched content and the absent event.
