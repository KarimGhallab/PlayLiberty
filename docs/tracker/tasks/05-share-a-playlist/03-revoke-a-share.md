# 03: Revoke a share

**Blocked by:** None. Can start immediately.
**Status:** resolved

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
