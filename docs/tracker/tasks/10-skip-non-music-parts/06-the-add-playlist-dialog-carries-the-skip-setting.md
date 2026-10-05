# 06: The add-playlist dialog carries the skip setting

**What to build:** The dialog that creates a playlist gains a "Skip non-music parts" control, on by default, so
the common case gets the behaviour without hunting for a setting. A listener who wants a source whole turns it
off before adding, and the chosen value travels with the create request. This is the listener's only choice
about the setting, because the server freezes it at creation.

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The control is drawn, on by default.
- [x] Turning it off sends the value false with the create request; leaving it on sends true.
- [x] The dialog's field and verbs are otherwise unchanged.
- [x] axe and the web unit suite pass.

**Verification:** the web unit suite, `pnpm run build`, `pnpm run lint` and `pnpm run design:check`.

## Outcome

Implemented and verified. `AddPlaylistDialog` gains a checkbox labelled "Skip non-music parts", on by default,
with a hint that says what it does and that it is chosen once. The label carries the name and the hint sits
outside it, reached through `aria-describedby`, so the control's accessible name is the four words and not the
sentence. `onSubmit` now carries the value, `useCreatePlaylist` takes `{ url, skipNonMusic }`, and the library
passes it through. A fresh open resets both the field and the choice, so a cancelled paste and a cancelled
choice do not linger.

The dialog's own row lives in a new `AddPlaylistDialog.module.scss`, so the shared shell is untouched and the
field and verbs are unchanged.

The design record was stale from ticket 01: it said "one field, because `CreatePlaylistInputSchema` has one",
and the schema now takes the URL and the boolean. The record and its specimen were updated together: the
specimen draws the control in all four arrangements, and the heights were re-measured rather than guessed. The
rest dialog is **327.2px** (was 255.6), the invalid one **367.6px** (was 296), and the sheet **306.2px** (was
234.8); the control's row is 55.3px and the dialog grows 71.6px for it.

The tests: the control starts checked; a submit sends true; turning it off sends false; and the library sends
the value in the create request both ways. `axe` runs over the dialog with the control in place.

Verification: `pnpm run test` (server 242, web 265, youtube 22, e2e 21), `pnpm run build`, `pnpm run lint` and
`pnpm run design:check` pass. No em dashes. Not committed.
