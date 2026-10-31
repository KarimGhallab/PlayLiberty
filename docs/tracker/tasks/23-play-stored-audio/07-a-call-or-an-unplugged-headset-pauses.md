# 07: A call or an unplugged headset pauses

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## What to build

The platform's audio focus is the only owner of interruptions. A call, another app's audio or an unplugged headset
pauses the current track, and the bar shows the paused state because the store follows the player's own status
rather than keeping a second play state.

When focus returns after a transient interruption, playback resumes only if the app was playing when focus was lost.
A player the listener paused stays paused. The notification, the lock screen and background playback remain spec
`24`'s; this ticket only reconciles the foreground player with the focus contract.

## Acceptance criteria

- [ ] A call or another app taking audio pauses the current track and the bar shows it paused.
- [ ] Unplugging headphones pauses instead of playing to the room.
- [ ] Playback resumes after a transient interruption only if it was playing when focus was lost.
- [ ] A player paused by the listener does not resume when focus returns.
- [ ] The bar's play state comes from the player's status, not a second copy.

## Verification

- A small unit test covers the resume policy, with the platform status stubbed; the platform's focus contract itself
  is not tested.
- On the device: take a call while a track plays, then end it; unplug headphones while a track plays; pause, lose
  focus and regain it, and confirm the paused player stays paused.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
