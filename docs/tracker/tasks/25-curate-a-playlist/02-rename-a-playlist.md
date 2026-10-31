# 02: Rename a playlist

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-actions-sheet-on-both-surfaces.md)

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

## Verification

- Mobile 392 tests across 44 suites pass, including the rename sheet, detail and gallery cases.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, in French, renaming from the detail changed the identity to `ChineTest` and the gallery card to
  `ChineTest`. Renaming from the gallery card restored `Chine`, and the detail agreed.
- With an empty field, `Enregistrer` was disabled.
- Airplane mode forced a refused rename; the sheet stayed open with `La playlist n'a pas pu être renommée.`, and
  closing without saving left the name `Chine`.

See [`25-curate-a-playlist`](../../specs/25-curate-a-playlist.md).
