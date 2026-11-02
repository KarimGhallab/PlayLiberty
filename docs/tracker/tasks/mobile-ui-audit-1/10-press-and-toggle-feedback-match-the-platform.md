# 10: Press and toggle feedback match the platform

**Status:** ready-for-agent
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

- [ ] Every `PressableScale` carries the Android state layer, without changing its scale and dim.
- [ ] The switch and checkbox keep their look and their roles, and gain the platform's press feedback.
- [ ] No control is left as the one exception.
- [ ] The existing component tests and Maestro flows pass unchanged.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `gallery-card`, `detail-add-batch` and `detail-share` flows pass on the emulator.
