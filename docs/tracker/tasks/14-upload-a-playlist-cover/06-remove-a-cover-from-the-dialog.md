# 06: Remove a cover from the dialog

**Status:** resolved

## Outcome

The cover dialog now offers **Remove cover** only while `coverUpdatedAt` is set, including after the custom image
fails to load. Pressing it asks once inline and replaces the square with the cover that will remain: the
first-track thumbnail, or the sleeve when there is none. Cancel returns to the dialog without a request, and
confirming sends `DELETE /playlists/:playlistId/cover`.

The remove reports a busy state, disables both its action and every close path, and cannot be pressed twice. A
successful remove closes the dialog, clears the cached cover version, invalidates the playlist and gallery reads,
and draws the first-track thumbnail or the sleeve. A failed remove keeps the dialog open with one sentence and
leaves the custom record and image in place.

Tests cover the Remove visibility, the failed custom image, the inline confirmation and its replacement
preview, the sleeve and failed-track fallbacks, the Cancel return, the busy state, the delete and both fallbacks
on the detail and gallery, the failure sentence, and the playlist/gallery invalidation.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
