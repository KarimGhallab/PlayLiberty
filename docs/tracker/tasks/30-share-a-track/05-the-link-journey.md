# 05: The link journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-links-failing-outcomes.md)

## Outcome

`link-track.yaml` launches the app, signs in when it must, and opens
`dev.playliberty.app://playlists/${PLAYLIST_ID}?track=${TRACK_ID}` with Maestro's link command while the app is warm.
It asserts the detail and the bar naming `TRACK_TITLE`, finds that track's row lane, opens its sheet, copies the link,
and waits for the copy notice. It backs out to the library.

The copy tap runs with `waitToSettleTimeoutMs: 0`, because the notice is a four-second window that a settle wait can
outlast. The README adds the flow's row, the three variables, the reminder that the track must not be the playlist's
last row, and the reason the flow opens a URL instead of tapping its way to the screen.

## Verification

- The flow passed twice in a row on `emulator-5554` with `Paradis`, the `Spear Pillar` track and its title.
- The app ended in the library after each run, and the second run opened the same link from the queue already at
  that track.

See [`30-share-a-track`](../../specs/30-share-a-track.md).
