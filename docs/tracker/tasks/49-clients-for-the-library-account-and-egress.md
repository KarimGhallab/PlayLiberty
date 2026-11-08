# 49: Clients for the library, the account and the Egress, and the old queries module goes

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Three clients join the Playlist client, each owning its reads, keys and invalidation:

- `accountClient` holds the account directory, the current account, the router's `currentAccountQuery` and `ownerNameFrom`, under `['accounts']` and `['me']`.
- `libraryClient` holds the gallery read, create, Sync all and pin, under one `['playlists']` key. The pin keeps the optimistic frame.
- `egressClient` holds the Egress read, Switch and Check, under `['egress']`; the two actions write that key from their answer.

The cover and delete mutations stay in the Playlist client because they act on a playlist; the library page's dialogs reach them through the shared actions menu. The detail, library and share dialog now split their imports by domain: playlist state from the Playlist client, accounts from the account client, the gallery from the library client. The router's admin guard uses the account client.

`shared/api/queries/queries.ts` is deleted with its directory. Its tests moved with their clients: mutation invalidation, retry-failed, Sync all, the owner-name helper and the cover crop. The endpoint table and the mock harness are untouched.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-web-stack).
