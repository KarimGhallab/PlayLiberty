# 03: The crop stage frames the cover

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-owner-for-the-crop-fractions.md) and [`02`](02-the-cover-sheet-saves-a-chosen-image.md)

## What to build

A chosen image turns the sheet's square into the crop stage. Drag pans, a two-finger pinch zooms, an accessible zoom
control moves in steps and reads its value, and Reset returns to centred at 1x. Zoom starts at 1x, the scale that
fills the square, and is capped at `min(3, 640 / shortEdge)` and never below 1x, so a small source does not zoom and
a large one never stores a soft square.

The stage paints the image at the source's aspect with its short edge spanning the square, then pans and scales it.
The visible square becomes four fractions from the shared crop module, and Save sends all four together; an
untouched stage sends none, which is the centred square the server already applies. Reset is disabled when the stage
is already centred at 1x.

The gesture layer uses what the app already has: a responder for drag and two touches, and a stepped control for
zoom. No gesture or animation dependency is added for this ticket.

## Acceptance criteria

- [ ] A panned and zoomed stage produces four fractions inside the image's bounds, and an untouched stage sends no
      crop fields.
- [ ] Zoom cannot exceed the quality cap nor fall below 1x, and pan is clamped so no empty edge shows.
- [ ] Reset returns to centred at 1x and is disabled when nothing moved.
- [ ] The zoom control is labelled, reports its value, and changes the zoom without a gesture.
- [ ] The four fractions travel together on Save and the stored square matches what the stage showed.

## Verification

- The shared crop suite gains the mobile-relevant cases only where the web suite does not already own them.
- `pnpm --filter @playliberty/mobile run test` covers the sheet's panned, zoomed and reset frames.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- On `emulator-5554`, pan and zoom a chosen image, save, and see the same square on the card and the detail.
