# 06: The add-playlist dialog carries the skip setting

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).
**Status:** resolved

## Outcome

Implemented and verified. `AddPlaylistDialog` gains a checkbox labelled "Skip non-music parts", on by default,
with a hint that says what it does and that it is chosen once. The label carries the name and the hint sits
outside it, reached through `aria-describedby`, so the control's accessible name is the four words and not the
sentence. `onSubmit` now carries the value, `useCreatePlaylist` takes `{ url, skipNonMusic }`, and the library
passes it through. A fresh open resets both the field and the choice, so a cancelled paste and a cancelled
choice do not linger.

The dialog's own row lives in a new `AddPlaylistDialog.module.scss`, so the shared shell is untouched and the
field and verbs are unchanged.

The design was stale from ticket 01: it said "one field, because `CreatePlaylistInputSchema` has one",
and the schema now takes the URL and the boolean. The design was updated to match: the control is drawn in
all four arrangements, and the heights were re-measured rather than guessed. The
rest dialog is **327.2px** (was 255.6), the invalid one **367.6px** (was 296), and the sheet **306.2px** (was
234.8); the control's row is 55.3px and the dialog grows 71.6px for it.

The tests: the control starts checked; a submit sends true; turning it off sends false; and the library sends
the value in the create request both ways. `axe` runs over the dialog with the control in place.

Verification: `pnpm run test` (server 242, web 265, youtube 22, e2e 21), `pnpm run build`, `pnpm run lint` pass. No em dashes. Not committed.
