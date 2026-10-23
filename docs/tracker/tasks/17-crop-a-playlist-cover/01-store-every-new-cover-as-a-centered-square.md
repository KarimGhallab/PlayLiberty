# 01: Store every new cover as a centered square

**What to build:** A new cover upload is stored as a square. When the request carries no crop, the server takes the centered square of the auto-oriented image. When it carries a crop, the server takes that region. Either way the square is capped at 1600px and written as WebP, so today's dialog, which sends no crop yet, starts producing square covers immediately.

**Blocked by:** None, can start immediately.
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

- [ ] The cover endpoint accepts four optional query fields, `cropX`, `cropY`, `cropWidth` and `cropHeight`, as fractions in `0..1`.
- [ ] The four are all-or-none, with `x + width <= 1` and `y + height <= 1`; a partial, non-numeric, zero-area or out-of-bounds set answers `422 unprocessable_request` and leaves the previous cover and file in place.
- [ ] With no crop fields, the stored image is the centered square of the auto-oriented image.
- [ ] With crop fields, the stored image is exactly that region of the auto-oriented image; an asymmetric fixture proves which region was kept, not only its size.
- [ ] A 90-degree EXIF image with a crop proves the image is oriented before the crop.
- [ ] The extracted square is capped at 1600px on its long edge without enlargement, then written as WebP at the existing quality.
- [ ] The raw image body, accepted content types, 5 MB limit, access rule, versioning, old-file delete, event and prune behavior are unchanged.
- [ ] Existing custom covers are not re-cropped or rewritten, and no schema or migration is added.
- [ ] Server tests cover the centered default, an explicit region, the orientation order, the refusals, the cap and an existing cover surviving the change.

**Verification:** `pnpm --filter @playliberty/server run build`, the server tests and `pnpm run lint:check` pass; an upload through the current dialog stores a square cover.
