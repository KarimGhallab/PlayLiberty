# 08: The player's critical journey

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-transport-moves-within-the-queue.md), [`04`](04-the-queue-is-a-sheet-above-the-bar.md)

## What to build

One Maestro flow proves the player's critical journey on a device. It stops and relaunches the app, uses the existing
sign-in fallback when signed out, opens the playlist named by `OWNED_PLAYLIST`, plays it, advances once, opens the
queue, copies a later row's title, jumps to that row and sees the bar name it. It then leaves the detail and asserts
that the bar is still there in the gallery before ending in the gallery.

The flow establishes its own state, uses test ids so a French device runs it unchanged, and does not depend on
gallery order or on a track name. The README records its row, the `OWNED_PLAYLIST` variable and the run command.

## Acceptance criteria

- [ ] The flow opens the named playlist, plays it and sees the bar.
- [ ] Advancing changes the bar's track.
- [ ] The queue sheet opens and a jump changes the bar's track to the chosen row.
- [ ] Leaving the detail keeps the bar visible in the gallery.
- [ ] The flow leaves the device in the gallery and passes unchanged on a French device.

## Verification

- `PATH="$HOME/.maestro/bin:$PATH" maestro test -e OWNED_PLAYLIST=<owned playlist> apps/mobile/.maestro/player-journey.yaml`
  passes in one run, repeated once.
- The other flows still pass in either order beside it.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
