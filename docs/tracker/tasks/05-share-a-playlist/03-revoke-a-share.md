# 03: Revoke a share

**What to build:** An owner takes a share back and it stops mattering at once. `DELETE
/playlists/:id/shares/:accountId` removes the share for the owner. The revocation takes effect on the next
request: the playlist drops out of the target's library, and the playlist read, its tracks, the stream and the
thumbnail all answer the same `404` a playlist that never existed answers, so a revoked share is a gone
playlist and not a fault. Revoking a share that is not there, including for an account that does not exist,
leaves the playlist unchanged and still succeeds, because the end state it asks for already holds. A stream
already in flight is not interrupted, because cutting it mid-file leaves a player with a half buffer and no
way back. Only the owner may revoke; a collaborator and a stranger answer `404`.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The owner revokes a share and it is gone from the listing.
- [x] After revocation the playlist no longer appears in the target's library.
- [x] After revocation the playlist read, its tracks, the stream and the thumbnail each answer `404` for the target, the same as a playlist that never existed.
- [x] Revoking a share that is not there leaves the playlist unchanged, and a target account that does not exist answers the same.
- [x] A write collaborator, a read collaborator and a stranger cannot revoke: each answers `404`.
- [x] The request is refused without the client header.

## Outcome

Implemented and verified. `DELETE /playlists/:id/shares/:accountId` is owner-only and answers `204`.
`revokeShareForAccount` checks `isPlaylistOwner` first, so a write collaborator, a read collaborator and a
stranger all answer the same `404`. The delete is idempotent: a share that is not there, including one aimed at
an account that does not exist, leaves the playlist unchanged and still succeeds, which is what the ticket
asked for, so no target-account existence check is made. `shareRoutes` no longer imports `sendNotImplemented`
because the feature's last stub is gone.

The five new tests cover the revocation and the empty listing; the target losing the library entry, the
playlist read and the tracks listing; a revocation of a share that is not there and of an account that does not
exist, each leaving an existing share alone; the three non-owner refusals; and the missing client header.

One criterion was narrowed with the user's agreement. It asked the stream and the thumbnail to answer `404`
after a revocation. Both are track routes, and spec 03 decided deliberately that a track an account cannot
reach answers `403`, not `404`, because a track row has to tell "you cannot play this" apart from "this is not
here"; after a revocation the track still exists, so `canAccountAccessTrack` is false and both routes answer
`403`. Changing that would override a resolved decision and lose the distinction, so the ticket's `404` holds
for the playlist and its tracks and the stream and thumbnail stay `403`. The test asserts the `403` explicitly
and names the reason.

Verification: `pnpm run test` (190 server tests, 5 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
