# 10: Share the gallery view model

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

Both galleries copy the same derived data. They sum the five status buckets and the retained count over the scoped playlists. They split the visible playlists into pinned, syncing and rest, with a pin above a running first sync. The two `scopeTotals` functions are byte for byte the same, apart from a comment.

## Expected

`@playliberty/library` owns the gallery view model. One selector returns the status totals and the retained count. One selector returns the three groups in draw order. Both galleries read those selectors and keep only their own drawing.

## Evidence

- The web `scopeTotals` sits at lines 73 to 96. The grouping sits at lines 239 to 246.
- The mobile `scopeTotals` sits at lines 140 to 163. The grouping sits at lines 341 to 348.
- Both reset the status filter when its count reaches zero, and both reset the scope when the last share leaves.

## Acceptance criteria

- [x] `library` owns the status totals and the retained total.
- [x] `library` owns the pinned, syncing and rest groups and their order.
- [x] Both galleries delete their local `scopeTotals` and their local grouping.
- [x] The selector has tests for the totals, the retained count and the group order.

## Outcome

`@playliberty/library` exports `TRACK_STATUSES`, `statusTotals` and `groupPlaylists`, plus the `StatusTotals` and `PlaylistGroups` types. `statusTotals` sums the five buckets and the retained count. `groupPlaylists` returns the pinned, syncing and rest groups, with a pin outranking a running first sync.

The web library page and the mobile gallery import both selectors. Their local `scopeTotals` functions, status constants and grouping filters are deleted.

Verification: the library suite runs 28 tests, the web library suite 50, the mobile gallery suites 59. `pnpm run build`, `pnpm run lint:check` and `pnpm run test:unit` pass.

## Verification

`pnpm --filter @playliberty/library test` proves the totals and the groups. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
