# 03: Cancel a running sync from the mobile detail

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The mobile `SyncBand` gained `onCancel` and `cancelling`: the control appears only for a running run, names the playlist in its accessible label, exposes busy and disabled, reads "Cancelling..." while pending and uses the shared cancel mutation. The detail passes it only to a writer, keeps the header control and floating dial disabled while the run is live, and routes a failure into the existing notice with "Could not cancel the sync" and the problem detail. The run band now keeps its "Syncing" stamp while running, and a cancelled run renders neutrally without counts or retry. The library invalidation is the shared one already covered by the client test, so the gallery row leaves the Syncing group when its refetched status becomes idle.

See [`34-cancel-a-sync`](../../specs/34-cancel-a-sync.md).
