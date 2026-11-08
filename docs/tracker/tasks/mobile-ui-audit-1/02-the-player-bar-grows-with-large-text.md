# 02: The player bar grows with large text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The bar's height is its content's. The capsule lost its fixed height and keeps `playerBarHeight - 6` as a floor; the
top row lost `flex: 1` for a 48pt floor. A `PlayerBarSizeProvider` in the app shell holds the published height, the
current page reports its capsule's measured height plus the 6pt the screens already reserved, and the gallery, the
detail, the egress console and the bare-track notice read `usePlayerBarHeight()` instead of the constant. At normal
scale the published value is the old 98; at font scale 2.0 the emulator drew a taller capsule with the title, playlist
name, queue count and both times readable, and the list padding followed.

The unit test renders the bar in the provider, fires a 120pt capsule layout, and asserts the published 126 and the
deck's 120. The test renderer does not lay out scaled text, so the no-clipping proof is the font-scale 2.0 emulator run
rather than a Jest measurement.

The gallery card's meta row overlaps at font scale 2.0 (the count wraps under the sync word). That is outside this
ticket's bar and needs its own fix.
