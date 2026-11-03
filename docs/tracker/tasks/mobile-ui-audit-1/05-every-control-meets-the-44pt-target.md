# 05: Every control meets the 44pt target

**Status:** resolved
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

## Outcome

The six controls take 44 points without changing what they paint. The seek rail and its row grew from 32 to 44, and the
knob centres explicitly on the rail, so the track stays 3pt; the bar's bottom row grows by 12, which the published
height from ticket 02 carries to the screens' padding. The two disclosure links and the two retries take a 44pt
`minHeight` with their text centred; the scope segments keep their 38pt drawn box and take 3pt of `hitSlop` above and
below, the pair's 2pt padding and 1pt border making up the rest.

Each target is asserted in its component's suite: the rail's height, the two links' and retries' `minHeight`, and the
scope's `hitSlop`. The emulator shows the taller seek row and the unchanged painted track.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The target test fails if any of the six drops below 44pt.
