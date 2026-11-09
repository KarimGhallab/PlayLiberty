# 03: Cancel a running sync from the mobile detail

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** 02. Needs the cancelled contract, the cancel command, the shared mutation and the cancelled run-band presentation.

## What to build

The mobile playlist detail's run band gains the same cancel action as web. It appears only when the latest run is running and the account may write. The header sync control and the floating dial action stay disabled while the run is running.

While the request is pending the button reads "Cancelling..." and is disabled; the run band stamp still reads "Syncing". A failure returns the button and shows the existing notice with "Could not cancel the sync" and the problem detail. A success invalidates the playlist, latest-run and library reads, shows no success toast, and the band shows the neutral "Sync cancelled" stamp with no retry. The gallery row leaves the Syncing group and rejoins Sync all.

The control exposes an accessible name that names the action and the playlist, and its busy and disabled states.

## Acceptance criteria

- [ ] The mobile run band shows Cancel only for a running latest run and a writable account.
- [ ] The mobile header control and floating dial action stay disabled while the run is running.
- [ ] Pressing Cancel calls the shared command, reads "Cancelling...", disables the action and keeps the "Syncing" stamp.
- [ ] A 204 and refetch show the neutral "Sync cancelled" stamp, the idle playlist, no retry and no toast.
- [ ] A failed cancel shows the notice with "Could not cancel the sync", keeps the syncing state and re-enables the action.
- [ ] A reader and a playlist whose latest run is not running show no Cancel action.
- [ ] The control has the playlist in its accessible name and exposes busy and disabled.
- [ ] The gallery row leaves the Syncing group and joins Sync all after the refetch.

## Verification

Run the mobile suite, then the repository build and lint checks: `pnpm --filter @playliberty/mobile test`, `pnpm run build`, `pnpm run lint:check`.

## Outcome

The mobile `SyncBand` gained `onCancel` and `cancelling`: the control appears only for a running run, names the playlist in its accessible label, exposes busy and disabled, reads "Cancelling..." while pending and uses the shared cancel mutation. The detail passes it only to a writer, keeps the header control and floating dial disabled while the run is live, and routes a failure into the existing notice with "Could not cancel the sync" and the problem detail. The run band now keeps its "Syncing" stamp while running, and a cancelled run renders neutrally without counts or retry. The library invalidation is the shared one already covered by the client test, so the gallery row leaves the Syncing group when its refetched status becomes idle.
