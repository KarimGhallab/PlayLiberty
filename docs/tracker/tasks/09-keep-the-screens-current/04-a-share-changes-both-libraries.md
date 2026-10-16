# 04: Granting or revoking a share changes both libraries

**Status:** resolved

## Outcome

Sharing is the last producer on the bus, and the revoked account is the one case where an account loses access to something it could see. A grant publishes `playlist.changed` with the audience read after the grant so it includes the new collaborator; a revoke publishes two, `playlist.removed` to the revoked account so its library drops the item and an open detail reads as gone, and `playlist.changed` to the owner and the accounts that remain. The removed event resets the playlist's queries rather than removing them, because a detail open on the playlist has an active observer and removing its query left a permanently loading screen. The dev proxy now keeps a `Remote-*` identity a request supplies and falls back to the local user otherwise, and the client's query client stopped retrying client errors so a `404` reaches the gone state at once, retrying only a server error or a request that never reached the server.

See [`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md).
