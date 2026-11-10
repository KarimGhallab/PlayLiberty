# 04: Pushed screens have a back control

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The detail's back control sits over the cover's top-left, a 44pt `surface-raised` circle with the chevron and the
shared "Back" word. It is drawn above the two action layers, because the first cut left it under the wide layer and
the emulator tap did nothing; the control now leaves through the same `leaveDetail` the pull uses. The egress
console's back is the first control in the `Screen` title row, and the gate's two loading screens carry the same
control. `common.back` is in both catalogs.

The egress gate owns the navigation: it goes back when the stack can, and replaces to the library when the console was
opened directly. The iOS edge swipe stays disabled because the detail is a sheet with its own pull; the control is the
documented path, as the ticket allows.

The Maestro `detail-play` flow now leaves by tapping `detail-back` instead of the hardware back.
