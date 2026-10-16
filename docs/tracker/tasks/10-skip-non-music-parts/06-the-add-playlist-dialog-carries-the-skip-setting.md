# 06: The add-playlist dialog carries the skip setting

**Status:** resolved

## Outcome

`AddPlaylistDialog` gains a checkbox labelled "Skip non-music parts", on by default, with a hint that says what it does and that it is chosen once, reached through `aria-describedby` so the control's accessible name is the four words and not the sentence. `onSubmit` now carries the value, `useCreatePlaylist` takes `{ url, skipNonMusic }`, and the library passes it through; a fresh open resets both the field and the choice, so a cancelled paste and a cancelled choice do not linger. The dialog's own row lives in a new `AddPlaylistDialog.module.scss`, so the shared shell is untouched and the field and verbs are unchanged. The rest dialog measures **327.2px** (was 255.6), the invalid one **367.6px** (was 296), and the sheet **306.2px** (was 234.8); the control's row is 55.3px and the dialog grows 71.6px for it.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
