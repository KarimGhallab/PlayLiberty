# 14: Animations run on the native driver

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

All six sheet timings now run on the native driver: the entry, the exit and the drag settle for both `translateY` and
`scrimOpacity`. The drag itself still sets the values from the gesture, and the release animation is native.

The sign-in equalizer keeps each bar's resting height as a static style and pulses `scaleY` between 1 and 0.35 with
`transformOrigin: 'bottom'`, the same pattern as the track bars. Its two timings use the native driver, and reduced
motion sets every scale back to 1, so the still silhouette is unchanged.

The sheet suite asserts the entry timing's `useNativeDriver`; the equalizer suite asserts the native config, the
`scaleY` transform and the bottom origin. The Maestro `library-and-account` flow (the account sheet) and `signed-out`
pass on the emulator, and the sheet opens and closes without a dropped frame.
