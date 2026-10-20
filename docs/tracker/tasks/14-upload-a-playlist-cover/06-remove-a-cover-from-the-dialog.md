# 06: Remove a cover from the dialog

**Status:** ready-for-agent

## What to build

The cover dialog offers Remove only while a custom cover exists. Pressing it asks once inline, and confirming
deletes the cover through the API. The dialog reports a busy state, keeps itself open with one sentence on
failure, and closes on success. The playlist then shows its first-track cover, and the sleeve when no track
cover exists. A failed custom preview still leaves Remove available because the custom record exists.

## Blocked by

[`03`](03-remove-a-cover-through-the-api.md), [`05`](05-set-a-cover-from-the-playlist-actions.md).

## Acceptance criteria

- [ ] Remove appears only when `coverUpdatedAt` is set, including when the custom image fails to load.
- [ ] Remove asks once inline before deleting, and Cancel returns to the dialog without a request.
- [ ] A successful remove closes the dialog, invalidates the playlist and gallery, and shows the first-track cover or the sleeve.
- [ ] A failed remove keeps the dialog open with one sentence and leaves the custom cover.
- [ ] The remove action reports a busy state and cannot be pressed twice.
- [ ] Web tests cover the confirmation, the delete, the fallback and the failure.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
