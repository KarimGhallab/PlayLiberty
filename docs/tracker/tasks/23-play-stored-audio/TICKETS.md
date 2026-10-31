# 23: Play stored audio on mobile

Tickets for [`23-play-stored-audio`](../../specs/23-play-stored-audio.md). One file per ticket, numbered in dependency
order, each declaring its blocking edges. The queue, the shuffle, the row press and the player store's source order
already exist from [`22-read-a-playlist`](../22-read-a-playlist/TICKETS.md); these tickets carry the bar, the
transport, the seek, the queue sheet, the failure paths, the refetch and audio focus.

| Ticket                                                                                        | Status          | Blocked by                                         | Blocks                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-the-bar-plays-the-queue`](01-the-bar-plays-the-queue.md)                                 | resolved        | none                                               | [`02`](02-the-transport-moves-within-the-queue.md), [`03`](03-the-seek-bar-reports-and-moves-position.md), [`05`](05-a-broken-track-is-skipped.md), [`06`](06-the-queue-follows-the-playlist.md), [`07`](07-a-call-or-an-unplugged-headset-pauses.md) |
| [`02-the-transport-moves-within-the-queue`](02-the-transport-moves-within-the-queue.md)       | resolved        | [`01`](01-the-bar-plays-the-queue.md)              | [`08`](08-the-players-critical-journey.md)                                                                                                                                                                                                            |
| [`03-the-seek-bar-reports-and-moves-position`](03-the-seek-bar-reports-and-moves-position.md) | resolved        | [`01`](01-the-bar-plays-the-queue.md)              | none                                                                                                                                                                                                                                                  |
| [`04-the-queue-is-a-sheet-above-the-bar`](04-the-queue-is-a-sheet-above-the-bar.md)           | wontfix         | [`01`](01-the-bar-plays-the-queue.md)              | none                                                                                                                                                                                                                                                  |
| [`05-a-broken-track-is-skipped`](05-a-broken-track-is-skipped.md)                             | resolved        | [`01`](01-the-bar-plays-the-queue.md)              | none                                                                                                                                                                                                                                                  |
| [`06-the-queue-follows-the-playlist`](06-the-queue-follows-the-playlist.md)                   | resolved        | [`01`](01-the-bar-plays-the-queue.md)              | none                                                                                                                                                                                                                                                  |
| [`07-a-call-or-an-unplugged-headset-pauses`](07-a-call-or-an-unplugged-headset-pauses.md)     | ready-for-agent | [`01`](01-the-bar-plays-the-queue.md)              | none                                                                                                                                                                                                                                                  |
| [`08-the-players-critical-journey`](08-the-players-critical-journey.md)                       | ready-for-agent | [`02`](02-the-transport-moves-within-the-queue.md) | none                                                                                                                                                                                                                                                  |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the store, the player and the surface it draws, demoable
  on its own.
- The bar, the transport, the seek, the queue sheet, the failure paths, the refetch and audio focus are this spec's.
  Background playback, the notification and the lock screen are [`24`](../../specs/24-play-in-the-background.md)'s.
- No ticket adds a volume rail, a mute toggle, a keyboard chord or a second playback path.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
