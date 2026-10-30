# 03: The track rows draw and play

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## What to build

The first page of tracks draws as rows. Each row carries the artwork, the title, the state word and tone from the
shared track-state helpers, the duration and, for a failed track, the shared failure sentence with the server's
reason behind a Show details control. The reason is shown as-is and never translated.

The current row is marked with its word and bars. Every row announces its title, state and duration as one label.
The paused word waits for `23`, which owns the transport.

A press anywhere on a playable row starts the queue at that track, built from the playlist's playable order read from
the queue route, not from the loaded page. An unplayable row has no play layer and its press does nothing; its text
stays readable. The row accepts an optional lane callback, which `04` supplies; this ticket draws no lane.

The audio is already mounted by the shell, so this ticket starts the queue without adding a transport. The bar is
spec `23`'s.

## Acceptance criteria

- [ ] A row draws its artwork, title, state word and duration.
- [ ] A failed row reveals the shared failure sentence and the server's reason, untranslated.
- [ ] A press anywhere on a playable row starts the queue at that track from the whole playable order.
- [ ] An unplayable row does not start a queue and keeps its text.
- [ ] The current row carries its word and bars.
- [ ] Each row announces its title, state and duration.
- [ ] The state words render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the row's and detail's Jest files, then `pnpm run build` and
`pnpm run lint:check`.
