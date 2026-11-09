# 01: Recover interrupted syncs at boot

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

App readiness runs `recoverInterruptedSyncs` from `features/sync/services/recoveryService.ts` after the startup sweep and before the background-job gate, so it runs with jobs disabled too. One transaction fails every `running` run with `finishedAt` and "The sync was interrupted by a server restart." and errors every `syncing` playlist with `updatedAt`; the updates are independent, so an orphan on either side is repaired. `lastSyncedAt`, associations, tracks, files, media and downloads are untouched, and no event is published. Four app-over-SQLite tests rebuild the app over the same database and cover the assembly, the two orphan sides, the clean boot, the idempotent second boot, the untouched content and the absent event.

See [`34-cancel-a-sync`](../../specs/34-cancel-a-sync.md).
