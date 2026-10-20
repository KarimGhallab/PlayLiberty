# 07: Prune unreferenced cover files

**Status:** resolved

## Outcome

`pruneOrphanCovers` joins the weekly prune. It reads the playlist rows' `coverPath` set first, walks `covers/`, and removes a file only when no row references it and its mtime is more than an hour old; referenced files and recent files stay. It logs `{ removed }` on `cover prune finished`, honours the scheduler's abort signal between files, and treats a missing covers directory as an empty sweep. The scheduler runs it after the track prune with the same logger and signal, so track behaviour is unchanged.

`deletePlaylistForAccount` now deletes the row with `RETURNING cover_path` and unlinks that file as a best effort. A failed unlink is caught, the delete still answers 204, and the now-unreferenced file is left to the sweep.

Coverage: four service tests (orphan old file, old referenced file, fresh unreferenced file, the logged count), a scheduler tick test for the cover sweep, and two DELETE route tests (the cover goes with the playlist; a read-only covers directory still answers 204 and leaves the file). Verification: `pnpm run build` passes, `pnpm run lint` is clean apart from the existing `phone.spec.ts` warning, the 376 server tests and all 37 e2e journeys pass.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
