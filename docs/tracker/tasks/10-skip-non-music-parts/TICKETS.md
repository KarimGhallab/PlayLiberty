# 10: Skip non-music parts

Tickets for [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md). One file per ticket, numbered in
dependency order, each declaring its blocking edges. The server tickets are verifiable through the API and the
media store; the web tickets through the screen and its tests. One set, `01` to `08`, with the web work last.

| Ticket                                                                                                          | Status          | Blocked by                                                                                             | Blocks                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-freeze-the-skip-setting-on-a-playlist`](01-freeze-the-skip-setting-on-a-playlist.md)                       | resolved        | none                                                                                                   | [`02`](02-store-a-track-with-non-music-parts-skipped.md)                                                                                                 |
| [`02-store-a-track-with-non-music-parts-skipped`](02-store-a-track-with-non-music-parts-skipped.md)             | resolved        | [`01`](01-freeze-the-skip-setting-on-a-playlist.md)                                                    | [`03`](03-write-the-duration-the-file-reports.md), [`04`](04-treat-a-sponsorblock-failure-as-retryable.md), [`05`](05-fetch-one-fileless-track-whole.md) |
| [`03-write-the-duration-the-file-reports`](03-write-the-duration-the-file-reports.md)                           | resolved        | [`02`](02-store-a-track-with-non-music-parts-skipped.md)                                               | none                                                                                                                                                     |
| [`04-treat-a-sponsorblock-failure-as-retryable`](04-treat-a-sponsorblock-failure-as-retryable.md)               | ready-for-agent | [`02`](02-store-a-track-with-non-music-parts-skipped.md)                                               | none                                                                                                                                                     |
| [`05-fetch-one-fileless-track-whole`](05-fetch-one-fileless-track-whole.md)                                     | ready-for-agent | [`02`](02-store-a-track-with-non-music-parts-skipped.md)                                               | [`08`](08-fetch-a-fileless-track-whole-from-the-row.md)                                                                                                  |
| [`06-the-add-playlist-dialog-carries-the-skip-setting`](06-the-add-playlist-dialog-carries-the-skip-setting.md) | ready-for-agent | [`01`](01-freeze-the-skip-setting-on-a-playlist.md)                                                    | none                                                                                                                                                     |
| [`07-show-the-skip-setting-read-only`](07-show-the-skip-setting-read-only.md)                                   | ready-for-agent | [`01`](01-freeze-the-skip-setting-on-a-playlist.md)                                                    | none                                                                                                                                                     |
| [`08-fetch-a-fileless-track-whole-from-the-row`](08-fetch-a-fileless-track-whole-from-the-row.md)               | ready-for-agent | [`02`](02-store-a-track-with-non-music-parts-skipped.md), [`05`](05-fetch-one-fileless-track-whole.md) | none                                                                                                                                                     |

## Conventions

- One file per ticket, numbered from `01` in dependency order, blockers first. The web tickets continue the same
  order at `06`, so the whole spec reads as one sequence.
- A ticket with no blockers can start immediately; the frontier is every ticket whose blockers are done.
- The server tickets are tracer bullets through the contract, the database, the adapter, the worker and its
  tests. The web tickets are tracer bullets through the screen, its hook, its contract and its tests.
- Resolve a ticket by recording its outcome in the ticket and updating its row here. Do not delete it.
