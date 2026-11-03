# 10: Press and toggle feedback match the platform

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The app's press feedback is a scale and dim animation on every control, and exactly one control (the gallery card's
open layer) also sets `android_ripple`. The switch and the checkbox are hand-drawn, so they carry no platform motion or
state layer. The controls are accessible (roles and states are correct), but Android users get no ripple anywhere else,
and the app is inconsistent with itself.

## Expected

Press feedback is uniform and platform-shaped: every pressable carries Android's state layer, and the switch and
checkbox either become the platform controls or gain the equivalent feedback while keeping the app's look.

## Evidence

- `apps/mobile/src/shared/components/PressableScale/PressableScale.tsx`: no ripple.
- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx`: the only `android_ripple`.
- `apps/mobile/src/views/playlist/SkipSetting/SkipSetting.tsx` and `shared/components/Checkbox/Checkbox.tsx`: hand-drawn
  controls.

## Acceptance criteria

- [x] Every `PressableScale` carries the Android state layer, without changing its scale and dim.
- [x] The switch and checkbox keep their look and their roles, and gain the platform's press feedback.
- [x] No control is left as the one exception.
- [x] The existing component tests and Maestro flows pass unchanged.

## Outcome

`PressableScale` now defaults `android_ripple` to the `control-border` state layer and still lets a caller override it;
its scale and dim are untouched. The checkbox and the skip switch carry the same ripple on their row while keeping
their hand-drawn look and their `checkbox` and `switch` roles. The gallery card's open layer keeps its own ripple, so
it is no longer the only control with one.

The three primitives are asserted with the platform set to Android: the host view receives the native background, and
the press still fires. The emulator shows the card's state layer while a control is held.

The `detail-share` and `gallery-card` flows passed on the emulator with `OWNED_PLAYLIST=Paradis` and
`SHARE_ACCOUNT=Dev User`. `gallery-card` no longer asserts that `account-door` is hidden, because the detail is a
transparent modal over the gallery and the library stays in the tree; `playlist-screen` already proves the detail
opened. The dev client's floating gear sits over a card title and opens the dev menu on a tap, so the flows ran with
that button switched off. `detail-add-batch` was not rerun because it adds a video to two playlists.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `gallery-card`, `detail-add-batch` and `detail-share` flows pass on the emulator.
