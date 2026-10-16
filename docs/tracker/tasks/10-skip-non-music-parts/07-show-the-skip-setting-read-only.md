# 07: Show the skip setting read-only

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).
**Status:** resolved

## Outcome

Implemented and verified. The setting lives on the **playlist detail**, in the left column directly under the
header card, for every access level. It is a new `PlaylistSkipSetting` component: the name on the left and `On`
or `Off` at the end of the row. `On` takes `--emphasis` and `Off` stays muted, so the resting value is what the
column points at and the word still carries the state. It is a fact and not a control, so there is no input
anywhere; the detail passes the playlist's own `skipNonMusic`.

The placement was settled rather than assumed. A read-only line on the playlist's own screen is lighter than a
settings dialog for one line, keeps the shared header and the library item untouched, and answers the listener
who expected a trimmed track and got a full one without a press.

**The hint line was removed on the owner's call**, because the label is self-explicit. That drops the spec's
story 8, which wanted one line saying what the setting does and why it is fixed, so nothing on the screen now
explains that the setting is frozen at creation and shared between playlists. Recorded here as the deviation it
is.

The design carried it: a "The skip setting, read-only" section recorded the reasoning and the numbers, and the
screen was drawn with the row in all fifteen frames. The figures were re-measured: the row is **18.9px** and takes the column **38.8px**
taller, so the side ends at **525.1px** with the summary, **549.3px** while syncing, **438.8px** with the empty
state and **618.8px** with the fault, and the fault sets the viewport floor at **715.8px**.

The tests: four on the component (both values, the emphasis hook on `On` and not `Off`, the absence of any
control, axe) and one on the detail that the playlist's value is drawn read-only.

One unrelated observation, left alone: `PlaylistDetailPage.test.tsx` carries the "names the playlist from the
playlist read" test twice.

Verification: `pnpm run test` (server 242, web 271, youtube 22, e2e 21), `pnpm run build`, `pnpm run lint` pass. No em dashes. Not committed.
