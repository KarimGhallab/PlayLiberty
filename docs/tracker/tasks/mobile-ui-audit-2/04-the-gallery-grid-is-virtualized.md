# 04: The gallery grid is virtualized

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The gallery maps every playlist into a `ScrollView`, and the read pages 200 at a time. A large library keeps 200
cards mounted, each with an image and a press surface, and re-renders them on player changes.

## Expected

A windowed list with two columns below 600 and three at or above, the pinned row as its header, and a bounded mounted
card count. The pull-to-refresh, the load-more, the scope and status filters and the empty and skeleton states stay.

## Evidence

- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx`: the `ScrollView` and the `map`.
- `apps/mobile/src/api/usePlaylists/usePlaylists.ts`: `PAGE_SIZE = 200`.

## Acceptance criteria

- [x] The gallery uses a virtualized list with the two and three column rule.
- [x] The pinned row remains the header, with its horizontal peek.
- [x] A 200-card fixture mounts a bounded number of cards, asserted by a test.
- [x] Pull-to-refresh, load-more, both filters, the empty state and the skeleton still work.

## Outcome

The gallery's scroll is a `FlatList` whose data is one row per line of cards, chunked by the shared
`galleryColumnCount` rule: two columns below 600 and three at or above. The pinned group is the list header, so its
horizontal row, its peek and its offset clamp are unchanged and it stays mounted. The syncing heading is a row of its
own, and the rest follows without one. Pull-to-refresh, the scroll-distance load-more, both filters, the empty state
and the skeleton are unchanged.

The gallery test renders 200 playlists and asserts that fewer than 200 cards mount, and the emulator at 390 draws two
columns with the pinned row at the top.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck` and
`pnpm run lint:check` pass. A 200-card fixture stays bounded on the emulator.
