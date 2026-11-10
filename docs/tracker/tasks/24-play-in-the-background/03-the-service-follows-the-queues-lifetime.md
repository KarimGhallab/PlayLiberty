# 03: The service follows the queue's lifetime

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
