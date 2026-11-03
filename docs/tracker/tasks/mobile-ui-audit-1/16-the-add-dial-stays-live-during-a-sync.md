# 16: The add dial stays live during a sync

**Status:** resolved
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

- [x] With one playlist syncing, the add trigger is enabled and opens the add sheet.
- [x] During the bulk sync the trigger still shows its busy state.
- [x] The Syncing heading and the per-card state are unchanged.
- [x] A test covers the single-sync case.

## Outcome

The dial's `busy` is now only `bulk.busy`. A single playlist's running sync keeps its card and the Syncing heading, and
the add trigger stays enabled and opens the add sheet. The bulk sync still owns the trigger's spinner and disabled
state through `bulk.busy`.

The gallery suite covers the single-sync case (the trigger is enabled and the add sheet opens) and the bulk case (the
trigger is disabled once the batch starts). The Syncing heading and the per-card state tests are unchanged. The
Maestro `gallery-add` flow was not run because it needs a `SOURCE_URL` and adds a playlist; the component test covers
the single-sync case.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `gallery-add` flow passes while a playlist is syncing.
