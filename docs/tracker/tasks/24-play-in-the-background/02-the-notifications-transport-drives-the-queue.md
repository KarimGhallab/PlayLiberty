# 02: The notification's transport drives the queue

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-service-starts-with-the-player.md)

## Outcome

The service contract now carries the current position, the track duration and whether previous and next are available.
The notification builds previous, play-pause and next, and its media session publishes the same transport actions plus
seek. The seek position and duration are in the session metadata and playback state, so the shade's media card draws
the progress rail. Next is omitted when the queue ends, and the session drops its skip-next action at the same time.

Commands come back through the same store actions the bar uses: previous calls `skipPrevious`, next calls `skipNext`,
play and pause call `setPlaying`, and a seek is converted to a bounded `seekToFraction`. There is no second queue or
play state in the service.

Position is mirrored once per whole second to keep the notification current without a 500 ms service write. The
service updates the media session on every state update but only rebuilds the foreground notification when a visible
fact changes.

## Verification

- Mobile 370 tests across 43 suites pass. Adapter tests cover previous, next, pause/toggle and a bounded seek, plus the
  position mirror and the `canNext` end state.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- The Android module compiled with `:app:assembleDebug` and the rebuilt client installed.
- On the emulator the notification showed `Piste précédente`, `Mettre en pause` and `Piste suivante`, and the shade's
  media card showed previous, pause, next and a seek rail.
- Next changed the title to the next track, an immediate previous returned, and a seek at about four fifths moved the
  bar to `0:58` on a `1:02` track. The app's service was the media-button session during the run.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
