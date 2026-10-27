# 47: The remaining refusals cross the responder, and the old outcomes go

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The cover, share and Sync endpoints now return the shared `Refused` outcome, and `sendRefusal` renders every one. The refusal table gained the cover's missing and invalid-image documents, the share's missing account and self-share, and the sync run's absent document; each keeps the status, code, title and detail it had.

The per-module outcome types are gone. `PlaylistCoverOutcome`, `GrantShareOutcome`, `ShareRevokeOutcome`, `SyncRunOutcome`, `StartSyncOutcome` and `StartOrConflict` are deleted. Cover results are an ok payload or a refusal; the share list, grant and revoke are the same; the latest sync run is the same; and both sync starts are one `StartSyncResult`, an ok run or a refusal. `sendPlaylistNotFound` is deleted with them, so no route imports a not-found helper or names a reason.

The batch add's per-item `refused` and the Track transition outcomes stay, as they name internal decisions rather than problem documents. The Egress routes stay out; their unreachable answer is a 200 body.

## Verification

- The cover's missing playlist, missing cover and invalid image; a share list, grant and revoke by an account that cannot manage the playlist; a grant naming an unknown account; a self-share; and a latest run that does not exist all answer the same documents as before.
- A denied share grant and a sync on a playlist the account cannot write are covered by the existing suites, which pass unchanged.
- No route file imports a not-found helper or chooses a not-found reason.
- `pnpm --filter @playliberty/server test` is 437 passed; `pnpm run test:unit` is 1201 passed; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#layer-boundaries-normative).
