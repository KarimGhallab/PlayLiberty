# 02: Pan and zoom the chosen cover in the dialog

**What to build:** After a valid file is chosen, the dialog's square becomes a crop stage. The image fills the square at 1x, drag pans it, the Zoom slider changes the scale, the stage takes arrow keys, and Reset returns to centered at 1x. Save is enabled without touching the controls, and the upload carries the visible square as four fractions so the server stores what the dialog showed.

**Blocked by:** 01.
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

- [ ] Choosing a valid file replaces the preview with the crop stage; the image fills the square stage at 1x, centered, with no empty edge.
- [ ] Dragging pans the image and clamps so the square stays covered; the stage is focusable and its arrow keys pan.
- [ ] A horizontal `role="slider"` named Zoom follows the volume and position slider pattern and takes pointer and arrow keys.
- [ ] The zoom maximum is `min(3, 640 / shortEdge)`, never below 1x; a source shorter than 640px does not zoom; the readout is a multiplier such as `1.0x`.
- [ ] Reset returns to centered at 1x.
- [ ] Save is enabled as soon as a valid file is chosen; saving untouched sends the centered square and stores it.
- [ ] Saving adjusted sends the four fractions as query fields; a failed save keeps the dialog and the crop.
- [ ] Choosing another file resets the crop; Cancel, Escape and the scrim keep their existing discard prompt; Remove is unchanged.
- [ ] An existing custom cover opens as a preview only; the crop stage appears only after a file is chosen.
- [ ] One hint line and the Zoom and Reset labels are translated in English and French.
- [ ] The dialog still works at 390px, with the stage at its widest 280px.
- [ ] Web tests cover the fraction math for landscape, portrait, zoomed and panned cases and the clamps; the drag, slider, keyboard, Reset, optional centered save and dynamic maximum; and the uploaded query. No canvas is used.

**Verification:** `pnpm --filter @playliberty/web run build`, the web tests and `pnpm run lint:check` pass; against 01, an adjusted upload reopens with the chosen square.
