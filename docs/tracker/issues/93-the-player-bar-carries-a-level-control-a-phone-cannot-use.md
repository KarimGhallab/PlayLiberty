# 93: The player bar carries a level control a phone cannot use

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Outcome

The player bar draws no volume control on a device that cannot hover. That is one capability query, `TOUCH_QUERY` (`hover: none`), not the 767px width: a phone in landscape is 844px wide and a narrow desktop window still has a pointer, so width was the wrong proxy. The bar's outer third grid column is then absent, which lets the transport and the seeker reach the bar's own padding rather than leaving a 48px gutter.

The control is the mute button and its rail together, so a phone loses both. The premise was that a phone's own volume manager owns the level, and a mute with no rail and no state to show would be a control the screen cannot explain. On the same devices the whole volume feature is inert: `PlayerAudio` pins the element to `volume = 1` and `muted = false`, so a level persisted on a desktop cannot arrive on a phone as a quiet with no slider to undo it, and the `M` and arrow bindings go with the component rather than staying as hidden keys. A pointer device keeps the stored level, the rail, the mute, the keys and the toast exactly as before.

`docs/DESIGN.md` now qualifies both places that treated the volume as a bar fixture: the accent use of the volume fill and the 44px touch-target reference are stated for a pointer input.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 37, youtube 31, ui-foundation 5, server 381, web 562). The bar's tests hold the mute on a pointer device and its absence under `TOUCH_QUERY`; the audio tests hold a stored 0.3 and a mute arriving as `volume = 1` and `muted = false` when the device cannot hover. The phone e2e test that tapped above the mute was replaced by one asserting the control is absent and a stored level does not reach the element; it typechecks but was not run here, since it needs the full instance. The phone bar was checked in Chrome at 390x844 with touch: no mute, no rail, `audio.volume` 1 with 0.3 stored, and the transport and seeker reaching the bar's padding.
