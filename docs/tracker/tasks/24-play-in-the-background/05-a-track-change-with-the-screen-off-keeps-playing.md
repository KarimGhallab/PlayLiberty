# 05: A track change with the screen off keeps playing

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-notifications-transport-drives-the-queue.md),
[`03`](03-the-service-follows-the-queues-lifetime.md)

## What to build

The physical-device journey that proves issue `102` is fixed on the app. Start a playlist, turn the screen off, let a
track end, and the next one plays rather than going silent. The notification names the next track and the lock screen
keeps the same controls throughout.

The journey runs on the phone that will use the app. It is the only proof that the foreground service keeps the queue
advancing with the screen off; neither an emulator-only pass nor a service unit test is accepted in its place.

If the device shows the JS player does not advance while the screen is off, this ticket owns moving the advance and
the queue handoff into the native service, so the same journey passes. It does not add a second queue or a second
play state.

## Acceptance criteria

- [ ] With the screen off, a finished track is followed by the next track's audio.
- [ ] The notification and lock screen name the new track after the change.
- [ ] The service survives the track change and Doze, and still stops when the queue ends.
- [ ] The journey passes on the physical phone the app is for.
- [ ] If the JS player cannot advance in the background, the native handoff makes the same journey pass.

## Verification

- The Maestro flow starts a playlist, drives the app, turns the screen off, waits for a track to finish, and asserts
  the next track's audio and notification on the physical device.
- The run is recorded with the device name and the track it crossed.
- No emulator-only or unit-only result is recorded as passing this ticket.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
