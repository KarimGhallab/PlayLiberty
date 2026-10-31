# 01: The service starts with the player

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

An app-owned Android media playback service, declared as a `mediaPlayback` foreground service, with one JS adapter
the player calls. A user press that begins playback starts the service. No background start is allowed, and no service
exists at rest.

The service holds the process for as long as the queue is non-empty, including while paused. It adds no wake lock, no
timer and no poll. The player in the app remains the only audio engine and the store remains the only queue.

On the first playback the app asks for notification permission. A refusal does not stop playback; it leaves the
notification absent and explains that once. The service creates one low-importance, silent channel and one
media-style notification. The notification carries the current track's title, the playlist name as its subtitle
(empty for a bare track), the artwork and one play-pause action. It is updated in place on every track change and
never stacks. A playlist cover is used when the playlist has one, otherwise the track thumbnail. The lock screen reads
the same session metadata, with the playlist as the album.

The notification is absent when nothing has played. It remains through pause and through screen-off playback.

## Acceptance criteria

- [ ] A user press starts the service; nothing starts it from the background and no service exists at rest.
- [ ] One low-importance, silent notification names the track and the playlist and shows the artwork.
- [ ] A bare queue has an empty playlist subtitle.
- [ ] One play-pause action controls the same track.
- [ ] A track change updates the existing notification rather than creating a second one.
- [ ] The lock screen shows the same title, playlist album and artwork.
- [ ] Notification permission is asked on first playback; a refusal keeps playback and explains itself once.
- [ ] Pause keeps the service and the notification, and screen-off playback continues.
- [ ] The service adds no wake lock, timer, poll or scheduled work.

## Verification

- Unit tests at the adapter and notification-mapping seams cover the user-action start, title and playlist mapping,
  the bare subtitle, the artwork choice, one notification on a track change and a refused permission.
- The dev client is rebuilt after the Android configuration change.
- On the device: play, inspect the notification and lock screen, pause and resume, and leave the screen off long enough
  to prove the audio survives. Confirm no notification exists before the first play.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
