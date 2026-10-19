# 34: One playlist read projection

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`playlistProjection.ts` is the one read projection. `toPlaylistView` (moved unchanged from `playlistService.ts`) assembles a `Playlist` from a row and its resolved access, shares, pin and cover facts; the detail read, the page read and all four mutation answers (rename, skip-non-music, sort, pin) build through it. Counts stay the page's own, added by its caller.

The cover gained one owner: `coverTrackIds` (batch) and `coverTrackId` (its single-playlist projection) resolve the first association by `position`, then `rowid`, so a position tie has one answer whichever read asks. The detail path now calls the single projection of the same resolver instead of its own position-only query, which is what made the tie disagree.

`listPlaylistsForAccount` fails closed: a visible row the batch access resolver did not answer is dropped from `items` rather than reported as `owner`. `total`, pagination, response shapes and status codes are unchanged, and the pin and shares lookups stay batched on the page path and single on the detail path.

Two tests hold it in `playlistRoutes.test.ts`: a position tie answers the same cover from `/playlists/:id` and `/playlists`, and a forced access-resolver miss leaves the row out of the page. The first failed before the change (detail `first`, page `second`); the second failed on the old `?? 'owner'`.

Verification: `pnpm --filter @playliberty/server run test` is 386 passed (28 files); `pnpm run build` and `pnpm run lint` pass. The playlist route, share access and sync suites pass unchanged.

## Objective

The detail read, the page read and every mutation answer build a `Playlist` through one module, so cover, pin, shares, access and counts have one owner.

## Context

Read `docs/ARCHITECTURE.md` (the server stack and the folder boundaries) and the playlists module first. The module currently has two projection paths. The single path resolves the row, the access level, the shares, the pin and the cover. The page path resolves the same fields in a batch and adds counts. Two drift points already exist: the cover tie is decided differently, and the page path falls back to `'owner'` when the access map omits a row.

Architecture review 2026-10-19, candidate 1.

## Scope

- One assembler takes a playlist row, the resolved access, the pin fact, the shares fact and the cover fact, and returns the contract `Playlist`. Counts stay additive for the page.
- The single read, the page read and the mutation answers call the assembler.
- The cover is the first association by position, then rowid, in both paths, so a position tie has one answer.
- The page read fails closed when a visible row has no resolved access, instead of falling back to owner.
- The pin and shares lookups stay batched on the page path and single on the detail path. Only the projection is unified.
- Every response shape and status code is unchanged.

## Out of scope

The access predicate internals (ticket 36), the route declarations (ticket 35), pagination and sorting.

## Blocking edges

None. Can start immediately.

## Verification

- A position tie returns the same cover from the detail and the page.
- A visible row with no resolved access is absent, not reported as owned.
- The existing playlist route, share access and sync suites pass unchanged.
- `pnpm run build`, `pnpm run lint` and the server suite pass.
