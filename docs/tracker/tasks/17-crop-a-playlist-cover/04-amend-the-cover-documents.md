# 04: Amend the cover documents

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The product capability now reads **Set, crop or remove a custom cover**. The architecture's image decision records that `sharp` auto-orients the image, crops the chosen square, caps the long edge at 1600px, strips metadata and writes WebP. It also says every new upload is square, a request without fractions uses the centered square, the uncropped original is not kept, and covers stored before the rule keep their aspect.

The glossary's custom cover row says a new upload is stored as the chosen square and the original is not kept. Its cover file row says a new file is the square crop of the upload, while one stored before cropping keeps its aspect. The design record places the crop in the cover dialog's own square, with no second screen and no dark surround.

Spec 14's out-of-scope crop line now points at spec 17 instead of reading as a universal exclusion, so the corpus has no contradiction.

See [`17-crop-a-playlist-cover`](../../specs/17-crop-a-playlist-cover.md).
