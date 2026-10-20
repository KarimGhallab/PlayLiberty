# 05: Set a cover from the playlist actions

**Status:** ready-for-agent

## What to build

The shared playlist actions menu gains Cover for owners and write collaborators on the detail and in the
gallery. It opens one compact dialog with a single square cover. The square accepts a dropped image; the
labelled Choose image button below opens the file picker and is the keyboard and touch path.

The dialog previews the selected image in the square, rejects a wrong type or a file over 5 MB with its own
sentence, and uploads the original bytes on Save. Save is disabled until a file is selected, shows a busy state
while the request runs, and keeps the dialog open with one sentence on failure. Cancel, Escape and the scrim ask
before discarding an unsaved selection. The dialog uses the shared dialog animation, focus trap and focus
return, and is checked at the desk and the 390px web arrangement.

## Blocked by

[`02`](02-set-and-read-a-cover-through-the-api.md), [`04`](04-draw-the-custom-cover-and-its-fallback.md).

## Acceptance criteria

- [ ] The Cover item appears for an owner and a write collaborator in both the detail and gallery menus, and not for a read collaborator.
- [ ] The compact dialog shows one square cover, accepts a drop, and opens the picker from the labelled button.
- [ ] A valid file previews in the square and uploads; the new cover appears in the header and gallery after success.
- [ ] A wrong type and an over-size file each produce their own sentence and no request.
- [ ] Save is disabled until a file is selected, reports a busy state, cannot be pressed twice, and the dialog cannot be dismissed while saving.
- [ ] A failed save keeps the dialog open with one sentence.
- [ ] Cancel, Escape and the scrim ask once before discarding an unsaved selection.
- [ ] The dialog uses the shared dialog's animation, focus trap and focus return, and works at 390px.
- [ ] An upload success invalidates the playlist and the gallery reads.
- [ ] Web tests cover the menu gating, the dialog states, the upload, the dirty close and the accessible names.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
