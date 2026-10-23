# 02: Pan and zoom the chosen cover in the dialog

**Status:** resolved

## Outcome

A chosen file turns the dialog's square into a crop stage: the image covers the square at 1x, drag and
the arrow keys pan it within the limit that keeps every edge covered, a horizontal `role="slider"`
named Zoom takes pointer and arrow keys and reads a one-decimal multiplier, and Reset returns to
centered at 1x. The framing is dimensionless, so `shared/coverCrop/coverCrop.ts` holds the fraction
math with no layout dependency, and the dialog only measures the stage to turn a pointer drag into
pan fractions. Save stays enabled as soon as a valid file is chosen; an untouched save sends no crop
fields and an adjusted save sends `cropX`, `cropY`, `cropWidth` and `cropHeight` with six decimals, so
a failed save keeps the dialog and the framing. The zoom maximum follows the decided quality guard,
`shortEdge / 640` clamped to `1..3`, which is the inverse of the formula written in the spec and
ticket: the spec's sentence and rationale are what shipped, and ticket 04 still has to correct the
formula there.

See [`17-crop-a-playlist-cover.md`](../../specs/17-crop-a-playlist-cover.md).
