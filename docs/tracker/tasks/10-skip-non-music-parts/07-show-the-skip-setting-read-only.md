# 07: Show the skip setting read-only

**Status:** resolved

## Outcome

The setting lives on the playlist detail, in the left column directly under the header card, for every access level, as a new `PlaylistSkipSetting` component: the name on the left and `On` or `Off` at the end of the row, with `On` taking `--emphasis` and `Off` muted, so the resting value is what the column points at and the word still carries the state. It is a fact and not a control, so there is no input anywhere, and the detail passes the playlist's own `skipNonMusic`. The hint line the spec's story 8 wanted was removed on the owner's call, because the label is self-explicit, so nothing on the screen explains that the setting is frozen at creation and shared between playlists. The row is **18.9px** and takes the column **38.8px** taller, so the side ends at **525.1px** with the summary, **549.3px** while syncing, **438.8px** with the empty state and **618.8px** with the fault, and the fault sets the viewport floor at **715.8px**.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
