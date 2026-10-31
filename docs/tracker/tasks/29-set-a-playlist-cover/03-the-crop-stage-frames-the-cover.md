# 03: The crop stage frames the cover

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-owner-for-the-crop-fractions.md) and [`02`](02-the-cover-sheet-saves-a-chosen-image.md)

## Outcome

A chosen image turns the sheet's square into the crop stage. The image is painted at its source aspect with its short
edge spanning the square; a drag pans it, a two-touch gesture zooms it, and the shared crop module supplies the cap,
the clamp and the four fractions. The stage uses the existing `PanResponder` and the shared module, so no gesture or
animation dependency was added.

Zoom starts at 1x and is capped by `maxZoom`, which clamps to `min(3, 640 / shortEdge)` and never below 1. The zoom
rail is an adjustable control: it is labelled, reports its value, moves in 0.1 steps through its increment and
decrement actions, and can also be pressed along its track. Reset returns to centred at 1x and is disabled when
nothing has moved.

Save sends the four fractions together, six decimals each, only when the stage moved; an untouched stage sends no
crop fields, so the server applies its centred square. The fractions come from `cropOf`, so the stored square is the
one the stage showed.

## Verification

- Mobile: 437 tests across 48 suites. The sheet covers the zoomed fractions, Reset's return and disabled state, and
  the quality cap; the untouched save still sends `crop: null`.
- The pan-to-fractions arithmetic stays with the shared crop suite. The sheet's pan wiring is proven on the device
  rather than with a synthetic gesture, which would assert PanResponder's physics.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554`, the library screenshot was chosen, panned left and set to 1.6x, then saved. The stored cover was
  a 728x728 WebP showing the same framed region on the gallery card. The cover was removed afterwards.

See [`29-set-a-playlist-cover`](../../specs/29-set-a-playlist-cover.md).
