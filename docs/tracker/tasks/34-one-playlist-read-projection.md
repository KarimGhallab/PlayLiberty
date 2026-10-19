# One playlist read projection

Status: open
Labels: `enhancement`, `ready-for-agent`

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
