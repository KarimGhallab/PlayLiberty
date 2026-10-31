# 24: Play in the background on mobile

Tickets for [`24-play-in-the-background`](../../specs/24-play-in-the-background.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. The tickets assume an app-owned Android media playback service,
because expo-audio's built-in lock-screen service cannot show previous and next, return to the current screen or clear
the queue on dismissal. expo-audio stays the audio engine and the store stays the only queue.

| Ticket                                                                                                          | Status          | Blocked by                                                                                                        | Blocks                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-the-service-starts-with-the-player`](01-the-service-starts-with-the-player.md)                             | resolved        | none                                                                                                              | [`02`](02-the-notifications-transport-drives-the-queue.md), [`03`](03-the-service-follows-the-queues-lifetime.md), [`04`](04-the-notification-returns-and-speaks-french.md) |
| [`02-the-notifications-transport-drives-the-queue`](02-the-notifications-transport-drives-the-queue.md)         | resolved        | [`01`](01-the-service-starts-with-the-player.md)                                                                  | [`05`](05-a-track-change-with-the-screen-off-keeps-playing.md)                                                                                                              |
| [`03-the-service-follows-the-queues-lifetime`](03-the-service-follows-the-queues-lifetime.md)                   | ready-for-agent | [`01`](01-the-service-starts-with-the-player.md)                                                                  | [`05`](05-a-track-change-with-the-screen-off-keeps-playing.md)                                                                                                              |
| [`04-the-notification-returns-and-speaks-french`](04-the-notification-returns-and-speaks-french.md)             | ready-for-agent | [`01`](01-the-service-starts-with-the-player.md)                                                                  | none                                                                                                                                                                        |
| [`05-a-track-change-with-the-screen-off-keeps-playing`](05-a-track-change-with-the-screen-off-keeps-playing.md) | ready-for-agent | [`02`](02-the-notifications-transport-drives-the-queue.md), [`03`](03-the-service-follows-the-queues-lifetime.md) | none                                                                                                                                                                        |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the service, the player and the surface it draws, demoable
  on its own.
- The local Android service owns the foreground notification and the media session. expo-audio remains the audio
  engine, the store remains the only queue, and no ticket adds a second play state.
- The notification permission is requested on the first playback, never at launch.
- The physical-device journey in `05` is the acceptance test for issue `102`. An emulator-only pass is not recorded as
  its proof.
- iOS background audio is out of scope, and the code keeps a no-op fallback outside Android.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
