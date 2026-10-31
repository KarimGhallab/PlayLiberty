# 02: The notification's transport drives the queue

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-service-starts-with-the-player.md)

## What to build

The notification and the lock screen carry previous, play-pause, next and the seek position. Pressing one of them
calls the same store action the bar calls, so there is one queue, one play state and one position.

Previous follows the bar's grace rule, next stops at the last entry rather than wrapping, and a seek is bounded to the
track. The media session and notification update from the player's own status after every command and every track
change. At the end of the queue, next is disabled or absent rather than sending a command that does nothing silently.

The notification's seek position reflects the current time and the track duration. Seeking from the shade lands on a
bounded position and the bar shows it when the app returns.

## Acceptance criteria

- [ ] Previous, play-pause and next exist in the notification and on the lock screen.
- [ ] Previous, next and pause call the same store actions as the bar and leave the queue unchanged.
- [ ] Next at the last entry is disabled or absent and does not wrap.
- [ ] The notification's seek position follows the player and a seek from the shade is bounded to the track.
- [ ] The notification and lock screen agree with the bar after every command.
- [ ] No second queue and no second play state exist in the service.

## Verification

- Adapter command tests prove each notification action reaches its store action, the ends behave, and a seek is
  bounded and applied once.
- On the device: pause, resume, previous and next from the shade and from the lock screen, then seek from the shade
  and confirm the bar agrees when the app returns.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
