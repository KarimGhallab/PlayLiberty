# 03: The track list is virtualized

**Status:** ready-for-agent
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

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `detail-play`, `detail-arrange` and `player-journey` flows pass, and a
1,000-track playlist scrolls on the emulator.
