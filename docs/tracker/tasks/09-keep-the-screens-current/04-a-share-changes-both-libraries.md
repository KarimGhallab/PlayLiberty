# 04: Granting or revoking a share changes both libraries

**What to build:** Granting a share makes the playlist appear in the other account's library at once, and
revoking it makes the playlist disappear, without a reload, in both directions. The share feature publishes to
the bus when a share is granted or revoked, naming both the owner and the account whose access changed; a
revoked share also tells the revoked account that the playlist is gone, so a screen open on it reads as the
not-found state rather than a fault. The library read and the playlist's shares read are invalidated on the
event. Reuses the bus, route, stream and fan-out from
[ticket 01](01-the-stream-and-a-playlists-sync-progress.md) and
[ticket 03](03-a-mutation-reaches-the-other-screen.md).

**Blocked by:** [`01`](01-the-stream-and-a-playlists-sync-progress.md),
[`03`](03-a-mutation-reaches-the-other-screen.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] Granting a share delivers an event to the grantee, whose library read is invalidated and whose library
      gains the item.
- [x] Revoking a share delivers an event to the revoked account, whose library loses the item and whose open
      detail reads as gone rather than as a fault.
- [x] The owner's library and shares read are invalidated on either change.
- [x] An e2e test drives two browser contexts and asserts the item appears and disappears in both without a
      reload.
- [x] Build, lint and the suites pass.

## Outcome

Implemented and verified. Sharing is the last producer on the bus, and the revoked account is the one case where
an account loses access to something it could see.

Two decisions worth naming.

A grant publishes `playlist.changed`, and the audience is read after the grant, so it includes the new
collaborator: one event makes the playlist appear in the grantee's library and moves the owner's shares read. A
revoke publishes two: `playlist.removed` to the revoked account, so its library drops the item and a detail open
on it reads as gone, and `playlist.changed` to the owner and the accounts that remain. The removed event resets
the playlist's queries rather than removing them: a detail open on the playlist has an active observer, and
removing its query leaves that observer with nothing to read, which showed up as a permanently loading screen
before the change.

The e2e needed two accounts, which the fixed dev identity did not allow, so the dev proxy now keeps a `Remote-*`
identity a request supplies and falls back to the local user otherwise. The partner is a second browser context
with its own headers, provisioned over the API first. The client's query client also stopped retrying client
errors: a `404` was being retried three times, so the gone state took seconds to appear. Only a server error, or
a request that never reached the server, is retried now.

Tests: two in the server's `liveEvents.test.ts` (a grant reaches the owner and the grantee, a revoke tells the
revoked account it is gone and the owner it changed) and one e2e that grants over the API, watches the item
appear in the partner's library, opens the detail, revokes, and watches it read as gone, with no reload.

Verification: `pnpm run build`, `pnpm run lint`, `pnpm test:unit` (server 271, web 303, packages green) and
`pnpm --filter @playliberty/e2e exec playwright test` (27 passed, 1.3m) all pass. No em dashes. Not committed.
