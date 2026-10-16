# The add-a-track end-to-end journey

**Status:** resolved

## Outcome

Landed. `adding one video to two playlists puts the same track in both` adds a video through the dialog with the second playlist checked, asserts the dialog closes on the all-success batch, and finds the track in both playlists. `an added video is fetched once and becomes playable` waits for the download and finds the play control in both playlists, which proves the dedup principle across the boundary: one video id, one stored file, shared by every playlist that references it. `e2e/support/instance.ts` gained `videoUrl(videoId)`, the video counterpart of `playlistUrl`, because the add dialog takes a video and the fake adapter keys its scenario by the id the validator extracts. The two new tests bring the e2e suite in `e2e/tests/curate.spec.ts` to 17 passing.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
