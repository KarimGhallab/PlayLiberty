# 08: The cover journey

**Status:** ready-for-agent

## What to build

One end-to-end journey proves the assembled feature against the real server, database and media root. It seeds
an owned playlist, a playlist shared with the browser account at the read level and a playlist shared at the
write level. It opens the cover dialog from the detail and from the gallery, selects a fixture image through the
real file input, and saves. It asserts the cover appears in both surfaces and survives a reload. The read
collaborator sees the cover and has no Cover item; the write collaborator can replace it. Removing the cover
returns the first-track cover, and a playlist with no track cover returns the sleeve.

The journey runs at the desk and at the web client's 390px arrangement. It does not use a stubbed upload.

## Blocked by

[`05`](05-set-a-cover-from-the-playlist-actions.md), [`06`](06-remove-a-cover-from-the-dialog.md).

## Acceptance criteria

- [ ] The journey uploads a real fixture image from the detail and sees it after reload.
- [ ] The same cover is drawn in the gallery and the detail.
- [ ] The read collaborator sees the custom cover and has no Cover item.
- [ ] The write collaborator can replace the cover.
- [ ] Removing the cover returns the first-track cover, and an empty playlist returns the sleeve.
- [ ] The journey covers both the desk and the 390px web arrangement.
- [ ] The journey uses the real file input and the real server, with no stubbed upload.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
