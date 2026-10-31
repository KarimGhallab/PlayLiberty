# 03: The service follows the queue's lifetime

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-service-starts-with-the-player.md)

## Outcome

The service now follows the queue's end. Clearing the player, emptying the queue or signing out reaches the bridge,
which stops the service; the service stops its foreground notification and releases the session. The session store's
`expire` clears the player before it marks the account signed out, so sign-out from any path stops playback and
removes the notification. A kill leaves no queue and the service is `START_NOT_STICKY`, so a relaunch starts at rest.

A delete intent and a `dismiss` command are wired: where the OS delivers a dismissal, playback stops and the queue
clears. Android 14 pins a `MediaStyle` foreground-service notification, so swiping the media card or Clear all does not
dismiss it. Removing the app task, however, calls the service's `onTaskRemoved`, which sends the same dismiss command
and stops the service. The accepted end controls on Android 14 are the queue ending, sign-out, the task swipe, and the
foreground-service task manager stop; a custom notification without `MediaStyle` would lose the standard media card and
seek surface.

## Verification

- Mobile 371 tests across 43 suites pass. The bridge tests cover stop on an empty queue, dismissal clearing the queue,
  and the session test covers `expire` clearing the player.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- The Android module compiled with `:app:assembleDebug`.
- On the emulator, pausing kept the notification. A force-stop removed the notification and the service, and the
  media-style notification stayed pinned against swipe and Clear all, matching Android 14.
- Swiping the PlayLiberty card out of the recents task list removed the notification and the service. Relaunching the
  app showed the gallery with no queue and no notification.
- Sign-out and queue-end were not re-run on the device; they rest on the player-seam tests.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
