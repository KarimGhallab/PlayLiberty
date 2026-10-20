# 03: Remove a cover through the API

**Status:** ready-for-agent

## What to build

An owner or write collaborator can remove a playlist's custom cover. The delete clears the stored path and the
cover version, removes the stored file, and answers no content. A delete with no custom cover is an idempotent
no-op. A read collaborator, a stranger and a missing playlist get the same not-found answer as an upload
refusal. A successful delete publishes the existing playlist-changed event after commit, so the playlist falls
back to its first track's cover, and then to the sleeve.

## Blocked by

[`02`](02-set-and-read-a-cover-through-the-api.md).

## Acceptance criteria

- [ ] Only the owner and a write collaborator can remove a cover; read collaborators, strangers and missing playlists get the same not-found answer.
- [ ] A successful delete clears `coverUpdatedAt` and the stored path, removes the cover file and answers no content.
- [ ] A delete with no custom cover succeeds as a no-op.
- [ ] The playlist read returns the first-track fallback after removal.
- [ ] A successful delete publishes the playlist-changed event; a refusal publishes none.
- [ ] A failed file delete does not fail the user action and leaves the file for the prune.
- [ ] Route tests cover the access matrix, the idempotent delete, the cleared version and the event.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
