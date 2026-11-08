# 13: The player bar isolates the position tick

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

`useBarState` no longer subscribes to `positionSeconds`; `BarState` and `BarView` no longer carry it. The subscription
lives in `LiveSeekBar`, a child of the current page that renders only the seek rail, so a tick repaints the fill, the
elapsed time and the knob and nothing else. The neighbouring page keeps its static zero. `Artwork` and
`PlayPauseGlyph` are wrapped in `memo`.

The render-count test wraps both components and asserts their counts do not change when `setPosition` runs while the
elapsed time does.
