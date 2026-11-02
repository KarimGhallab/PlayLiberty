# 16: The add dial stays live during a sync

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The gallery's floating action is disabled whenever any playlist is syncing, not only during the bulk sync. A first
sync can run for minutes, and for its whole duration the add action is a dead spinner even though adding a playlist is
unrelated to the running sync.

## Expected

Only the bulk sync drives the trigger's busy state. A single playlist's running sync keeps its card and its Syncing
heading, and the add action stays live.

## Evidence

- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx`: the dial's `busy` is `bulk.busy || anySyncing`.
- `apps/mobile/src/shared/components/ActionDial/ActionDial.tsx`: `busy` disables the trigger and turns it into a spinner.

## Acceptance criteria

- [ ] With one playlist syncing, the add trigger is enabled and opens the add sheet.
- [ ] During the bulk sync the trigger still shows its busy state.
- [ ] The Syncing heading and the per-card state are unchanged.
- [ ] A test covers the single-sync case.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `gallery-add` flow passes while a playlist is syncing.
