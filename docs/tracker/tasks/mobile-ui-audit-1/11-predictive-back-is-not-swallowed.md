# 11: Predictive back is not swallowed

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The detail installs a `BackHandler` that returns `true` for every back press, and its route sets `gestureEnabled:
false`. Android 14 cannot preview the destination, so the back gesture gives no animation until the custom slide
starts, and the user cannot see where back will land.

## Expected

The system owns the back gesture and previews the gallery. The detail's leave animation runs when the pop commits, not
instead of the system preview.

## Evidence

- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx`: the `BackHandler` listener.
- `apps/mobile/app/_layout.tsx`: `gestureEnabled: false` and `animation: 'none'`.

## Acceptance criteria

- [ ] On Android 14 the back gesture shows the gallery in the predictive preview.
- [ ] The detail still animates out on commit, with no double pop and no flash of the wrong screen.
- [ ] The guard that keeps a delete from leaving mid-window still holds.
- [ ] The egress console and the sheets are unaffected.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. On an Android 14 emulator the back preview shows the gallery and the detail leaves once.
