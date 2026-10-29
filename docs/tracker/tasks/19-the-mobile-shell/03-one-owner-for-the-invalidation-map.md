# 03: One owner for the invalidation map

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately, and must land before `04`.

## What to build

The cache-effect map and the live-event invalidation leave the web app and become a package both clients consume:
`@playliberty/query`. The map stays the one place a query key is written, so the mobile stream cannot drift from
the keys the web already reads. Copying the map into the app was rejected for that reason.

The web repoints its import sites at the package. Nothing else about its behaviour changes, and its suite passing
untouched is the proof. The package is wired into the workspace the way the other packages are, including the
tsconfig paths, syncpack and the build.

## Acceptance criteria

- [ ] The package exports the cache effects and the live-event invalidation.
- [ ] The web imports both from the package, and its suite passes with no behavioural change.
- [ ] No client writes a query-key literal outside the package.
- [ ] `depcruise` reports no violation, and no package imports an app.
- [ ] `pnpm run build`, `syncpack` and the tsconfig path check pass.

## Verification

`pnpm run build`, `pnpm run lint:check`, `npx --no-install depcruise .`, `syncpack` and
`pnpm --filter @playliberty/web run test` all pass.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
