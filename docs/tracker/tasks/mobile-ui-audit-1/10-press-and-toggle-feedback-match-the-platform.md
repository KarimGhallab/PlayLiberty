# 10: Press and toggle feedback match the platform

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

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
