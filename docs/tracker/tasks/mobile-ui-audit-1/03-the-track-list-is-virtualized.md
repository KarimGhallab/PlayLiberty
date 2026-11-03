# 03: The track list is virtualized

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The detail renders its tracks in a `ScrollView` over `rows.map`, and the read pages 100 rows at a time with no upper
bound. A 1,000-track playlist keeps 1,000 rows mounted, each with a 48pt image, a lane control and an `onLayout`
handler. Scroll cost and memory grow with playlist length.

## Expected

The list recycles rows, so the mounted row count stays bounded while scrolling a long playlist. Paging, the
current-row landing and the header's scroll behaviour are unchanged.

## Evidence

- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx`: the `ScrollView` and the `rows.map`.
- `apps/mobile/src/api/usePlaylistTracks/usePlaylistTracks.ts`: page size 100.

## Acceptance criteria

- [ ] The track list is a virtualized list, with the identity, the controls and the run band in its header.
- [ ] A 1,000-track fixture mounts a bounded number of rows, asserted by a test.
- [ ] The current-row landing still scrolls to the playing row once per open.
- [ ] Paging still appends at the end, and a failed append still offers its retry.
- [ ] The header still follows the scroll and reverses when the list reverses.

## Outcome

The detail's list is a `FlatList`. The identity, the controls, the skeleton, the read failure and the empty bodies are
its header; the append spinner and its retry are its footer. The rows are the data, keyed by track id, with 12 initial
rows and a 7-viewport window, so a 1,000-track fixture mounts fewer than 50 rows.

The landing moved to the list: the first viewability pass reports whether the current row is already on screen, and
when it is not, the list scrolls to the row's index once per open with a 16pt offset. A failed `scrollToIndex` falls
back to an estimated offset and retries. Paging still runs from the scroll handler at the same distance, and the
header still follows the offset.

The tests were rewritten to the list's seam: the landing calls `scrollToIndex` once, a visible current row is left
alone, another playlist's queue does not land, and 1,000 tracks stay bounded. The detail suite passed at 106 tests; the
emulator scrolled the 71-track playlist at font scale 2.0.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `detail-play`, `detail-arrange` and `player-journey` flows pass, and a
1,000-track playlist scrolls on the emulator.
