# 01: The detail reads a playlist

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The playlist route now draws the detail instead of its id. It reads the playlist, the first page of its tracks at 100
per page and the latest sync run, and resolves the owner from the account directory. A latest run the playlist read
still calls idle or syncing shows the sync line as syncing, so a run that started after the read is not hidden.

The identity block and the first page's rows are one scroll. The block draws the 96-point cover from the shared
custom, first-track, sleeve chain with the session headers, the name as the heading, the share mark, the owner line
for a shared playlist, the count, the sync state and the last-synced stamp. Play and Shuffle are drawn disabled until
ticket `06` supplies their callbacks. The platform back returns to the gallery; the screen draws no back button.

The share mark and the sync state colour moved into one shared module that the gallery card and the detail both read,
so the card's marks and tone cannot drift from the detail's.

A pending or failed playlist read draws the route's frame and no body. Ticket `02` adds the skeleton, not-found and
failure bodies. The first page's rows are plain title and duration; ticket `03` replaces them with the full row, its
play layer and its state words.

The full suite exposed a stale duplicate `useCreatePlaylist` test at the old path and a gallery mock still naming the
moved module. The duplicate was removed and the mock path corrected, so the suite runs again.

## Verification

- Detail 10 tests and card 9 tests pass; mobile 174 tests across 28 suites pass.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- The Maestro `gallery-card` flow still targets `playlist-screen`; ticket `12` runs the detail journeys.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
