# 01: The bar plays the queue

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

Pressing a stored row or the playlist's Play starts one playlist queue and begins the track that was pressed. The bar
appears above the bottom inset and stays over every screen until the queue stops.

The store keeps the queue order as track ids and carries the metadata the bar needs: title, duration, thumbnail and
the playlist id and name when the queue came from a playlist. A stream address is derived only when the track is
reached, never stored. One native player plays one source at a time; nothing is prefetched, crossfaded or overlapped.

The bar draws the artwork, the title, the playlist name when there is one, and one play-pause control that states what
a press will do. It is mounted once in the app shell, so it survives a navigation. It is absent when there is no
current track. A bare queue draws the title and no playlist name or artwork link.

Every screen that scrolls pays the bar's height under its last row while the bar is present. The gallery's add
action, the detail's add action, and the detail's snackbar and notice clear the bar instead of sitting under it. A
finished track advances; the last track finishing stops playback and removes the bar. The bar and its states are in
both catalogs.

## Acceptance criteria

- [ ] A stored row press starts audio at that row and the bar appears with its artwork, title and playlist name.
- [ ] The play-pause control pauses and resumes the same track, and its label states the action it will perform.
- [ ] One track plays at a time and nothing is prefetched.
- [ ] A finished track advances to the next entry; finishing the last track stops playback and the bar is absent.
- [ ] The bar survives leaving and returning to a screen, and a relaunch with no queue draws no bar.
- [ ] The gallery and detail can scroll their last row above the bar, and the add action, snackbar and notice clear it.
- [ ] A queue with no playlist draws the title only, with no playlist name or artwork link.
- [ ] The bar's controls name the track they act on, and every visible string exists in English and French.

## Verification

- Mobile unit tests at the store, audio and bar seams, plus `pnpm --filter @playliberty/mobile run typecheck`.
- `pnpm run lint:check` and `pnpm run build`.
- On the emulator: play a row, pause and resume, let a track finish, leave and return to the screen, and confirm the
  bar never covers a last row.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
