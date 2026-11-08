# 09: Share the bulk sync batch state machine

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The web library page keeps the bulk sync batch inline. It holds the batch, the notice and the settle effect. The mobile gallery calls a local hook that owns the same machine, and both pages already call `batchBusy` and `bulkSyncNoticeFor` from `@playliberty/library`. The React state machine is the only part left duplicated.

## Expected

One hook in `@playliberty/api-client` owns the batch. It exposes `count`, `busy`, `notice`, `start` and `dismissNotice`. Both clients call it. The library package keeps the policy, and each page keeps its own control and notice surface.

## Evidence

- The web library page holds the batch at lines 119 and 205 to 232, and the settle effect at lines 284 to 297.
- The mobile `useBulkSync` hook is 73 lines and exposes the same five values.
- Both start the batch with `syncAll.mutate(ids, { onSuccess })`, then freeze the batch until a list read taken after it settles finds none of it running.

## Acceptance criteria

- [x] One hook owns the batch, the busy flag, the count, the notice, `start` and `dismissNotice`.
- [x] The web library page has no batch state and no settle effect.
- [x] The mobile gallery delegates to the shared hook, and its local hook is deleted.
- [x] The frozen count and the settle rule behave as before on both clients.

## Outcome

`@playliberty/api-client` exports `useBulkSync` with `count`, `busy`, `notice`, `start` and `dismissNotice`. The hook takes the sync-all mutation from the caller, so each client keeps the mutation hook at its own seam and the shared hook owns only the batch state.

The frozen count and the settle rule sit in `bulkSyncStatus` and `bulkSyncSettled`, and the hook calls both. The web library page passes `useSyncAllPlaylists` into the hook, drops its batch, notice and settle state, and withdraws the notice on the shared window. The mobile gallery imports the hook from `api-client`, and its local hook is deleted.

Verification: api-client runs 44 tests, the web library suite 50, the mobile gallery suites 59. `pnpm run build`, `pnpm run lint:check` and `pnpm run test:unit` pass.

## Verification

The shared hook has a test that covers the frozen count and the settle. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
