# 07: Play stored audio

Tickets for [`07-play-stored-audio`](../../specs/07-play-stored-audio.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. This spec is the web client's, so the seam is the player
store and its components against a fake audio element, with one hand check for a real seek in a real browser.

| Ticket                                                                                              | Status          | Blocked by                                                                                                                                    | Blocks                                                                                             |
| --------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`01-build-the-queue-and-play-it`](01-build-the-queue-and-play-it.md)                               | resolved        | none                                                                                                                                          | [`02`](02-the-audio-element-and-the-browser-controls.md), [`03`](03-skip-what-cannot-be-played.md) |
| [`02-the-audio-element-and-the-browser-controls`](02-the-audio-element-and-the-browser-controls.md) | resolved        | [`01`](01-build-the-queue-and-play-it.md)                                                                                                     | [`03`](03-skip-what-cannot-be-played.md), [`04`](04-the-track-list-and-the-player-bar.md)          |
| [`03-skip-what-cannot-be-played`](03-skip-what-cannot-be-played.md)                                 | ready-for-agent | [`01`](01-build-the-queue-and-play-it.md), [`02`](02-the-audio-element-and-the-browser-controls.md)                                           | [`04`](04-the-track-list-and-the-player-bar.md)                                                    |
| [`04-the-track-list-and-the-player-bar`](04-the-track-list-and-the-player-bar.md)                   | ready-for-agent | [`01`](01-build-the-queue-and-play-it.md), [`02`](02-the-audio-element-and-the-browser-controls.md), [`03`](03-skip-what-cannot-be-played.md) | none                                                                                               |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- Each ticket is a tracer bullet: a complete path through the store, the audio element and its tests, demoable on its own.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
