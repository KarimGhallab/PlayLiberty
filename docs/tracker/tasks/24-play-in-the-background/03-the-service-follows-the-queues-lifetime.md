# 03: The service follows the queue's lifetime

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-service-starts-with-the-player.md)

## What to build

The service lives exactly while the queue is non-empty. It keeps running while the queue is paused, then stops and
removes its notification when the queue empties, when the account signs out, or when the notification is dismissed.

Dismissing the notification stops playback and clears the queue, so a dismissed session cannot resume from an
invisible queue. Signing out clears the player and the notification before the session leaves. A process kill leaves
no queue and no service: a relaunch starts at rest, and the service never restarts by itself.

There is one notification at most. Emptying the queue or signing out removes it.

## Acceptance criteria

- [ ] The service and notification survive a pause and stop when the queue empties.
- [ ] Signing out stops playback, clears the queue and removes the notification.
- [ ] Dismissing the notification stops playback and clears the queue.
- [ ] A relaunch after a kill has no queue, no service and no notification.
- [ ] The service never starts itself from the background.
- [ ] One notification exists at most and none exists at rest.

## Verification

- Player-seam tests with a fake service cover start, pause keeping it alive, an emptied queue stopping it, sign-out
  stopping it, and dismissal clearing the queue.
- On the device: let the last track finish, sign out with music playing, dismiss the notification during playback, and
  kill and relaunch the app.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
