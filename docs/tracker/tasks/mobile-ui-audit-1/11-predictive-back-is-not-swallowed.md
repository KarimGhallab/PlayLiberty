# 11: Predictive back is not swallowed

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

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
