# 01: Carry the cover through the playlist read

**Status:** ready-for-agent

## What to build

Add the storage and contract shape for a custom playlist cover without changing any visible behavior. The
playlist row gains a nullable server-only cover path and a nullable cover version. The playlist contract gains a
nullable `coverUpdatedAt`, and every existing playlist read and mutation answer carries `null` until the feature
starts. The first-track `coverTrackId` remains unchanged.

This is the prefactor that lets the API and the web tickets build on one agreed read shape.

## Blocked by

None. Can start immediately.

## Acceptance criteria

- [ ] A migration adds nullable cover path and cover version columns to the playlist row.
- [ ] The playlist contract carries nullable `coverUpdatedAt` and never the stored path.
- [ ] Every playlist read and mutation answer carries `coverUpdatedAt: null` before any cover exists.
- [ ] Existing server and web fixtures and mocks compile and pass with the new field.
- [ ] `coverTrackId` and every other playlist field are unchanged.
- [ ] No screen or API behavior changes.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
