# 02: Rename a playlist

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-actions-sheet-on-both-surfaces.md)

## What to build

Rename is a sheet with one prefilled field, opened from the detail's actions sheet and from the gallery card. It
replaces the placeholder on both screens.

The field starts with the current name and selects it on focus. The name is trimmed before it is checked. Save is
disabled while the trimmed name is empty, and an overlong name is refused by the schema without a request. While the
request runs, the field and Save are busy, so a second press cannot rename twice.

A refusal keeps the sheet open with one sentence, the problem's title when there is one. A success closes the sheet
and refreshes the playlist and the gallery. The write touches the name and nothing else.

Rename is the owner's alone. A writer and a reader see no Rename item, and the route refuses them when asked
directly.

## Acceptance criteria

- [ ] Rename opens from the detail's actions sheet and the gallery card for the owner only.
- [ ] The field is prefilled with the current name and selected on focus.
- [ ] Save is disabled for an empty trimmed name, and an overlong name never leaves the sheet.
- [ ] A valid name is trimmed and sent once, with the field and Save busy while it runs.
- [ ] A refusal keeps the sheet open with one sentence; a success closes it and refreshes the playlist and the
      library.
- [ ] A writer and a reader see no Rename item.
- [ ] The copy is in English and French.

## Verification

- The rename sheet tests, the detail tests and the gallery tests.
- `pnpm --filter @playliberty/mobile run typecheck`
- `pnpm run lint:check` and `pnpm run build` once at the end.
- On the emulator: rename from the detail and from the gallery card, confirm both screens agree, and force a refusal
  to see the sheet stay open.
