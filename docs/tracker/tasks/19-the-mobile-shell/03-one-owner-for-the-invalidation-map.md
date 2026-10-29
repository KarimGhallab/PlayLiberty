# 03: One owner for the invalidation map

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately, and must land before `04`.

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

## Verification

- `pnpm run build` and `pnpm run lint:check` pass.
- `npx --no-install depcruise .` reports no violation over 428 modules, so no package imports an app.
- `syncpack lint` reports no issue, and the tsconfig path check passes.
- Web 638, query 10, mobile 38, i18n 42, all green. The web's count dropped by exactly the ten tests that moved
  into the package.

## Notes

- A key builder passed as a value instead of called collapses the hash to `undefined`, because `JSON.stringify`
  drops functions, and every query then shares one cache entry. The web suite caught two such call sites during
  this work, and the type check caught two more where a key is a required argument. Ticket `07` removes the
  remaining chance of it by making the parameterless keys constants.
- `pnpm install` links the new package but exits non-zero on `ERR_PNPM_IGNORED_BUILDS` for `unrs-resolver`. That
  comes from the placeholder value in `pnpm-workspace.yaml` and is older than this ticket. Approving a build script
  is the human's call, so it was left alone.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
