# 47: The remaining refusals cross the responder, and the old outcomes go

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The cover, share and Sync endpoints now return the shared `Refused` outcome, and `sendRefusal` renders every one. The refusal table gained the cover's missing and invalid-image documents, the share's missing account and self-share, and the sync run's absent document; each keeps the status, code, title and detail it had.

The per-module outcome types are gone. `PlaylistCoverOutcome`, `GrantShareOutcome`, `ShareRevokeOutcome`, `SyncRunOutcome`, `StartSyncOutcome` and `StartOrConflict` are deleted. Cover results are an ok payload or a refusal; the share list, grant and revoke are the same; the latest sync run is the same; and both sync starts are one `StartSyncResult`, an ok run or a refusal. `sendPlaylistNotFound` is deleted with them, so no route imports a not-found helper or names a reason.

The batch add's per-item `refused` and the Track transition outcomes stay, as they name internal decisions rather than problem documents. The Egress routes stay out; their unreachable answer is a 200 body.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#layer-boundaries-normative).
