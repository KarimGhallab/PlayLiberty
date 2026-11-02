# 14: Animations run on the native driver

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

Ten animations opt out of the native driver. Five of them are the sheet frame's entry, exit and drag on `translateY`
and `scrimOpacity`, so a screen transition competes with the JS thread. The sign-in equalizer animates `height`, a
layout property, six times over.

## Expected

The sheet's transform and opacity run natively. The equalizer scales on the Y axis with a bottom origin, as the track
bars already do. Reduced motion still takes the resting form, and the visuals do not change.

## Evidence

- `apps/mobile/src/shared/components/Sheet/Sheet.tsx`: five `useNativeDriver: false`.
- `apps/mobile/src/shared/components/SignInDoor/EqualizerBars.tsx`: `height` with `useNativeDriver: false`.
- `apps/mobile/src/shared/components/TrackBars/TrackBars.tsx`: the `scaleY` pattern to copy.

## Acceptance criteria

- [ ] The sheet's entry, exit, drag and scrim animations use the native driver.
- [ ] The equalizer animates `scaleY` with a bottom origin, not `height`.
- [ ] Reduced motion keeps the still silhouette and the instant sheet.
- [ ] The sheet still dismisses on drag and the scrim still follows the drag.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro sheet flows and `signed-out` pass, and the emulator shows no frame drop on a
sheet open or close.
