# The add-a-track end-to-end journey

**Objective:** Prove the add-a-track capability through a real browser, server and database, which is the one
claim the unit tests cannot reach: that a pasted video URL resolves on the server, that one file is fetched
once for several associations, and that the same track becomes playable in every playlist it joined.

**Blocked by:** [`09`](09-the-add-a-track-dialog.md).

**Scope**

- `e2e/support/instance.ts` gains `videoUrl(videoId)`, the video counterpart of `playlistUrl`, because the add
  dialog takes a video and the fake adapter keys its scenario by the id the validator extracts.
- Two tests in `e2e/tests/curate.spec.ts`: one that adds one video to two playlists and finds the same track in
  both, and one that waits for the worker to store the single file and finds the play control in both.

**Outcome**

Landed. `adding one video to two playlists puts the same track in both` adds a video through the dialog with
the second playlist checked, asserts the dialog closes on the all-success batch, and finds the track in both
playlists. `an added video is fetched once and becomes playable` waits for the download and finds the play
control in both playlists, which is the dedup principle proven across the boundary: one video id, one stored
file, shared by every playlist that references it.

**Verification**

- `pnpm --filter @playliberty/e2e run test`: 17 tests pass, the two new ones included.
- `pnpm --filter @playliberty/e2e run typecheck` passes.
