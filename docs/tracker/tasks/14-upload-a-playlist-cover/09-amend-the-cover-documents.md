# 09: Amend the cover documents

**Status:** resolved

## Outcome

Amended the four product records to describe the custom playlist cover and its fallback. `docs/PRODUCT.md` gains the capability and names the custom, first-track, sleeve order. `docs/GLOSSARY.md` defines the playlist cover, the custom cover, the cover file and the sleeve, adds the cover to the media store, and separates the playlist cover from a track thumbnail. `docs/ARCHITECTURE.md` records the `covers/` directory and the immutable versioned WebP, the server-only path with the contract's `coverUpdatedAt`, the image normalisation boundary beside the no-transcoding audio rule, the sync's refusal to touch a cover, and the prune's cover sweep.

`docs/DESIGN.md` keeps the custom, first-track, sleeve fallback and says the custom cover is per playlist and shared with every reader.

The two artwork issues that carried the old rule are amended. Issue 10 is marked superseded on the ownership rule and keeps its first-track pipeline as the fallback; issue 05 records that this spec restores a separate stored cover; their board summaries no longer state that the playlist owns no image. A search for the old claims across the product records and issues finds no contradiction.

Docs only; no test exercises prose. `pnpm run build` passes, and `pnpm run lint` is clean apart from the existing unused-constant warning in `e2e/tests/phone.spec.ts`.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
