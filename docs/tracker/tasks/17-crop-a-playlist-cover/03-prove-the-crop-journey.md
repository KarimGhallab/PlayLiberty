# 03: Prove the crop journey end to end

**Status:** resolved

## Outcome

The cover journey now crops. An owner chooses a 1000x800 two-band PNG through the dialog, zooms to
1.2x and drags off-centre, and the upload request carries `cropX`, `cropY`, `cropWidth` and
`cropHeight` inside `0..1` with the width below 1 and the origin away from the centred position. The
stored cover decodes as a square on the detail page, in the gallery, and after a reload. A second
upload saves untouched, sends no crop fields, and stores a square as well. The read collaborator pass
is unchanged and the 390px pass now also asserts the crop stage is shown before it saves.

The journey found a real defect: rounding the crop region's two edges independently could store
666x667 for a square request. The server now rounds the region's width and height, which keeps a
square request square, and `coverRoutes.test.ts` owns that rule.

The journey asserts roles, the request query and the decoded dimensions only: no CSS classes, no
presentation `data-*`, and no pixel output, which the server suite owns.

See [`17-crop-a-playlist-cover.md`](../../specs/17-crop-a-playlist-cover.md).
