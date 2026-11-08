# 04: The cover journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`gallery-cover.yaml` opens `OWNED_PLAYLIST`, opens the cover sheet from the detail's actions, chooses the first tile
in the system photo picker, pans the stage left, raises the zoom from its rail, and saves. It leaves the playlist for
the gallery, returns, sees the playlist cover, and reopens the cover sheet to prove a custom cover exists by its
Remove item. It removes the cover, dismisses the sheet, and ends in the gallery.

The picker is the only surface tapped by position. The fixture is the newest photo in the library, which puts it
first in the picker's grid; everything else is found by an app id. The README adds the flow's row, the fixture's
push-and-scan command with the `touch` that makes it newest, and the reason for the picker point.

See [`29-set-a-playlist-cover`](../../specs/29-set-a-playlist-cover.md).
