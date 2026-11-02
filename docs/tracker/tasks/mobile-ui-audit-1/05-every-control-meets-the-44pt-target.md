# 05: Every control meets the 44pt target

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

Six interactive elements are below the app's own 44pt rule:

- The player bar's seek rail is 32pt tall.
- The track row's "show details" link has no padding, about 14pt.
- The run band's "show details" link is about 14pt.
- The detail's append retry is about 35pt.
- The gallery's scope segments are 38pt with no `hitSlop`.
- The share picker's "more" retry is about 35pt.

The seek rail is the primary transport gesture, and the disclosure links are the only route to a failure's reason.

## Expected

Every one of them takes a 44pt target without changing what it paints. A control smaller than the target grows a box
that paints nothing, as the player bar's step buttons already do.

## Evidence

- `apps/mobile/src/player/PlayerBar/SeekBar.tsx`: `styles.rail` at `space-7`.
- `apps/mobile/src/views/playlist/TrackRow/TrackRow.tsx`: `styles.reveal`.
- `apps/mobile/src/views/playlist/SyncBand/SyncBand.tsx`: `styles.reveal`.
- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx`: `styles.appendRetry`.
- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx`: `styles.segment`.
- `apps/mobile/src/views/library/ShareAccountPicker/ShareAccountPicker.tsx`: `styles.moreRetry`.

## Acceptance criteria

- [ ] Each of the six controls has a target of at least 44 by 44 points.
- [ ] The seek rail's painted track and knob are unchanged; only its target grows.
- [ ] The two disclosure links still look like links, not buttons.
- [ ] A test measures each target, as the web's chip-target test does.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The target test fails if any of the six drops below 44pt.
