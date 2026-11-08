# 08: The cover journey

**Status:** resolved

## Outcome

`e2e/tests/cover.spec.ts` assembles the feature against the real server, database and media root, with no stubbed upload. Four tests tell the story:

- An owned playlist uploads a PNG from the detail through the real file input, and the custom cover appears in the detail and the gallery, survives a reload, and opens the same dialog from the gallery. Removing it returns the first track's stored thumbnail, and an empty playlist draws the sleeve.
- A playlist owned by a partner and shared read reaches the browser with its custom cover and no **Update the cover** item; the reader's gallery menu carries Pin alone.
- A playlist shared write lets the browser replace the partner's cover from the gallery; the versioned URL changes, so a cached image cannot hide it, and both surfaces show the replacement after a reload.
- At 390px the row arrangement opens the dialog from the detail, saves, and draws the cover in the detail and the gallery card.

The partner identities and their shares are created through the API so the access levels are the server's facts; the browser stays the dev account. The fixture images are in-memory PNG buffers passed to the real file input.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
