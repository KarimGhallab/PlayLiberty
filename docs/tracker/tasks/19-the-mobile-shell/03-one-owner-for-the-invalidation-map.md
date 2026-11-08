# 03: One owner for the invalidation map

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/query` is the one owner of the keys and the map. It exports the key builders (`libraryKey`,
`playlistKey`, `playlistPrefix`, `playlistTracksKey`, `playlistQueueKey`, `latestSyncRunKey`,
`playlistSharesKey`, `currentAccountKey`, `accountsKey`, `egressKey`, `trackKey`), the cache-effect map, and the
live-event invalidation. The map and its tests moved with the keys, so the assertions that pin the key shapes now
run in the package instead of the web app.

The five web clients import the builders and no longer declare a key. The mobile client consumes the same builders
for its account read and its session-cache guard, which is what keeps the stream in `04` from drifting. The package
is wired like the others: a workspace dependency in both clients, a path in `tsconfig.depcruise.json`, and a place
in the root `build:packages` list.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
