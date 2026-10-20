# 07: Prune unreferenced cover files

**Status:** ready-for-agent

## What to build

The weekly orphan prune also sweeps the covers directory. It builds the set of cover paths referenced by
playlists, deletes files no playlist references and older than one hour, and leaves referenced files and recent
files alone. It logs the count and keeps the rest of the orphan prune unchanged.

Deleting a playlist removes its cover file as a best effort. A failed delete is left for the next prune rather
than failing the playlist delete.

## Blocked by

[`01`](01-carry-the-cover-through-the-playlist-read.md).

## Acceptance criteria

- [ ] The weekly prune deletes an unreferenced cover file older than one hour.
- [ ] It keeps a referenced cover file and an unreferenced file inside the one-hour grace window.
- [ ] It logs the number of cover files removed and leaves track pruning unchanged.
- [ ] Deleting a playlist removes its cover file as a best effort.
- [ ] A failed cover file delete does not fail the playlist delete.
- [ ] Prune tests cover the orphan, the referenced file, the grace window and the playlist delete.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
