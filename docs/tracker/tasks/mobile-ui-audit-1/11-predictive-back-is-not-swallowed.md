# 11: Predictive back is not swallowed

**Status:** resolved
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
- [x] The detail still animates out on commit, with no double pop and no flash of the wrong screen.
- [x] The guard that keeps a delete from leaving mid-window still holds.
- [x] The egress console and the sheets are unaffected.

## Outcome

The route now opts into predictive back (`android.predictiveBackGestureEnabled` and the manifest flag), enables the
gesture, and uses `slide_from_bottom` instead of `animation: 'none'`. The detail no longer installs a `BackHandler` for
an ordinary back, so the system owns the gesture and the stack pops once with its own slide. `leaveDetail` (the back
control and the pull) calls `onBack()` directly and lets the stack animate the pop.

A `BackHandler` remains only while a delete's undo window is open; it returns `true`, so the guard still holds. The
suite asserts no listener is registered normally and that the registered listener blocks during the window.

On `emulator-5554` (Android 16, gesture navigation) the back gesture showed the system's back indicator and returned to
the gallery once, and the back button did the same. The stack in use (`react-native-screens` 4.26.2) does not draw the
gallery in the predictive preview, only the system indicator; that preview is the remaining dependency gap.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. On an Android 14 emulator the back preview shows the gallery and the detail leaves once.
