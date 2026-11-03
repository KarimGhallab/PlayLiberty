# 14: Animations run on the native driver

**Status:** resolved
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

- [x] The sheet's entry, exit, drag and scrim animations use the native driver.
- [x] The equalizer animates `scaleY` with a bottom origin, not `height`.
- [x] Reduced motion keeps the still silhouette and the instant sheet.
- [x] The sheet still dismisses on drag and the scrim still follows the drag.

## Outcome

All six sheet timings now run on the native driver: the entry, the exit and the drag settle for both `translateY` and
`scrimOpacity`. The drag itself still sets the values from the gesture, and the release animation is native.

The sign-in equalizer keeps each bar's resting height as a static style and pulses `scaleY` between 1 and 0.35 with
`transformOrigin: 'bottom'`, the same pattern as the track bars. Its two timings use the native driver, and reduced
motion sets every scale back to 1, so the still silhouette is unchanged.

The sheet suite asserts the entry timing's `useNativeDriver`; the equalizer suite asserts the native config, the
`scaleY` transform and the bottom origin. The Maestro `library-and-account` flow (the account sheet) and `signed-out`
pass on the emulator, and the sheet opens and closes without a dropped frame.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro sheet flows and `signed-out` pass, and the emulator shows no frame drop on a
sheet open or close.
