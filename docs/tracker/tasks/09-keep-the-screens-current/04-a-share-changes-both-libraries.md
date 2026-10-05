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

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Granting a share delivers an event to the grantee, whose library read is invalidated and whose library
      gains the item.
- [ ] Revoking a share delivers an event to the revoked account, whose library loses the item and whose open
      detail reads as gone rather than as a fault.
- [ ] The owner's library and shares read are invalidated on either change.
- [ ] An e2e test drives two browser contexts and asserts the item appears and disappears in both without a
      reload.
- [ ] Build, lint and the suites pass.
