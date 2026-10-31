# 03: The track rows draw and play

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## Outcome

The first page of tracks now draws as rows. A row carries the track thumbnail with the session headers, the title, the
state word and tone from the shared track-state helpers, the duration, and, for a failed track, the shared failure
sentence with the server's reason behind a Show details control. The reason is shown as-is and never translated. A
missing thumbnail falls back to the raised surface.

The current row carries the Playing word and the accent bars over its artwork. The paused word waits for `23`, which
owns the transport. Every playable row's play target is labelled with its title, state and duration, so the row is
announced as one control. An unplayable row has no play target and keeps its text.

The play target is an absolute layer behind the row's content, so a press anywhere starts the queue and the Show
details control still receives its own press. The queue is read from the playlist queue route and starts at the
pressed track, so the queue is the whole playable order rather than the loaded page. The shell's mounted player takes
over from there; no transport is drawn here.

The ticket added the shared `isPlayable`, `failureSentence`, `trackToneColor`, `mediaSource` and `TrackBars` modules,
and the queue read. The gallery cover and the chip now share the media source and tone helpers, so the cover URL and
the colours cannot drift.

The row accepts the lane callback in its interface but draws no lane; ticket `04` adds it.

## Verification

- Row 7 tests and detail 22 tests pass; mobile 193 tests across 29 suites pass.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, pressing the first row of the shared playlist started the queue and marked the row Playing with the
  bars.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
