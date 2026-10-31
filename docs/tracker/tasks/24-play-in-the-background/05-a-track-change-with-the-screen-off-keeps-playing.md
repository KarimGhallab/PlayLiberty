# 05: A track change with the screen off keeps playing

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-notifications-transport-drives-the-queue.md),
[`03`](03-the-service-follows-the-queues-lifetime.md)

## Outcome

The physical-device journey is in `apps/mobile/.maestro-device/background-journey.yaml`, outside the standard
`.maestro` suite because it leaves the phone locked. It opens `OWNED_PLAYLIST`, starts its fourth playable row, waits
for the bar and locks the screen. With `OWNED_PLAYLIST=Paradis` that row is `Azure Flute`.

The run was on the physical `SM-S931B` (`RZCY11E39KV`, Android 17), signed in through the USB dev proxy. The flow
passed, and the device was left locked.

While the screen stayed off, the queue crossed from `Pokemon- Black and White- Lets Go Together- Music` to `Victory
Lies Before You! (Last Pokémon): Remastered ► Pokémon Black & White`. The notification title changed to the new track,
and the lock screen showed that track, its artwork, `Paradis`, the seek rail and previous/play-pause/next. The media
session stayed `PLAYING`.

A forced deep-idle then left the media session `PLAYING` at `1:34`, so the service survived Doze. The JS player
advanced the queue; no native handoff was needed.

The README records the device-only command, the fourth-row requirement, and the `dumpsys` checks.

## Verification

- Physical run on `SM-S931B` / `RZCY11E39KV`, Android 17: the Maestro driver passed and locked the phone.
- Screen off for 60 seconds: the notification and lock screen moved from Pokemon Black and White to Victory Lies
  Before You, and the media session reported `PLAYING`.
- Forced deep idle: the media session remained `PLAYING` at `1:34`; Doze did not stop the audio.
- The device was force-stopped afterwards and the temporary `localhost` dev configuration was restored.
- No source changed; the mobile suite and build were not rerun for this ticket.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
