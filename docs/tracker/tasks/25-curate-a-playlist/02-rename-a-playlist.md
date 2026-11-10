# 02: Rename a playlist

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Rename is a sheet with one prefilled field, opened from the detail's actions sheet and from the gallery card. It
replaces the rename placeholder on both screens.

The field starts with the current name and selects it on focus. The name is trimmed before the schema check. Save is
disabled while the trimmed name is empty; an overlong name shows the schema sentence and never leaves the sheet. The
field and Save are busy while the write runs, and the sheet cannot be dismissed then.

A refusal keeps the sheet open with the mapped problem sentence, falling back to `renameDialog.failed`. A success
closes the sheet and refreshes the playlist and the library through the playlist-changed cache effect. The write
sends only the name. The owner gate is the actions model and the server's same owner-only route.

The copy is in both catalogs; `renameDialog.failed` is the new sentence.

See [`25-curate-a-playlist`](../../specs/25-curate-a-playlist.md).
