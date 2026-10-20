# 05: Set a cover from the playlist actions

**Status:** resolved

## Outcome

The shared playlist actions now carry **Update the cover** (`Changer l'image`) for an owner and a write
collaborator on both the detail and the gallery; a read collaborator still has no cover action. The item opens
one compact dialog with a single square, a labelled **Choose image** button below it, and a drag-and-drop
square. The square shows the current cover before a selection and the selected preview after one.

The dialog validates JPEG, PNG and WebP at up to 5 MB with its own wrong-type and too-large sentences, and
sends the original bytes as a raw `POST`. Save is disabled until a file is selected, the busy state disables
Save and every close path, and a failed save keeps the dialog open with one sentence. Cancel, Escape and the
scrim all ask once before discarding a selection, with Keep editing and Discard. The dialog uses the shared
dialog shell for its animation, focus trap and focus return, and the card arrangement at 390px reaches the
same dialog.

A successful upload closes the dialog, writes the returned playlist into the cache, and invalidates the
playlist and gallery reads. The card and tile headers then request the new versioned cover.

Verification: `pnpm run build` passes; the full unit suite passes (server 381, web 524); lint has no errors and
only the existing unused `CONTROL` warning in the phone journey.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
