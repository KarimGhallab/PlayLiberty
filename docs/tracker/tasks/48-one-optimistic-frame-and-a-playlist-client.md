# 48: One optimistic frame, and a Playlist client for the detail

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/api/optimisticPatch/optimisticPatch.ts` is the one optimistic frame: cancel the read in flight, snapshot it, apply the change, and restore the snapshot on a refused write. The skip-non-music switch, the sort control and the pin all use it; no mutation copies the frame by hand.

`shared/api/clients/playlistClient.ts` is the Playlist client. It owns the playlist read, the latest sync run, the paginated track read and its queue, the sync start, the batch add, cover set and remove, rename, skip and sort, delete, retry, fetch-whole and remove, and the shares read, grant and revoke. Its key builders are private; the queue read is reached through `readPlaylistQueue` and `cancelPlaylistQueue`, so the play transition names no key either.

The detail page, the playlist actions menu, the share dialog, the tab title and the play transition import from the client. The page's playlist and track state no longer comes from the old module, and no detail module names a key. The account directory, the current account and the library read still come from the old module; ticket 49 gives them their own clients. The pin mutation stays there too, because it writes the library page, but it already uses the shared frame.

The old module now carries only the library, account and Egress reads plus the library's create, sync-all and pin actions. The mutation invalidation suite was split at the import line, and the detail suite is unchanged.

## Verification

- The optimistic frame has its own test: it cancels, snapshots, applies, restores, and leaves an absent read absent.
- Each mutation still names its one cache fact.
- The detail suite passes unchanged; the page moves an optimistic control on the press and restores it on a refused write.
- `pnpm --filter @playliberty/web test` is 606 passed; `pnpm run test:unit` is 1204 passed; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-web-stack).
