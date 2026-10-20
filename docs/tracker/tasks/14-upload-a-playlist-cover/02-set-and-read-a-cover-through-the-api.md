# 02: Set and read a cover through the API

**Status:** ready-for-agent

## What to build

An owner or write collaborator can upload a custom cover for a playlist, and any account that can read the
playlist can fetch it. The upload accepts a raw JPEG, PNG or WebP body up to 5 MB. The server normalises it with
`sharp`, auto-orients it, caps the long edge at 1600px, strips metadata and stores WebP at quality 0.86. The
stored file is immutable and versioned, and the playlist row records its path and the new `coverUpdatedAt`.

The upload route resolves the playlist at the write need. The cover media route resolves it at the read need and
serves the stored WebP with the private media cache. A missing cover answers not-found. A successful upload
publishes the existing playlist-changed event after commit. The edge proxy allows the larger image request.

## Blocked by

[`01`](01-carry-the-cover-through-the-playlist-read.md).

## Acceptance criteria

- [ ] A raw image body is accepted for JPEG, PNG and WebP, capped at 5 MB, with no multipart dependency.
- [ ] `sharp` is added to the server, the container build succeeds, and the edge proxy accepts the larger cover request.
- [ ] The server rejects an unsupported type, a non-image body, an image over 64 megapixels and a file over 5 MB, leaving the previous cover untouched.
- [ ] A valid upload is stored as WebP with a long edge no greater than 1600px, no metadata and a new cover version.
- [ ] Only the owner and a write collaborator can upload; a read collaborator, a stranger and a missing playlist get the same not-found answer.
- [ ] A reader can fetch the cover as a versioned, privately cached WebP; a playlist without a cover answers not-found.
- [ ] The stored file is written before the row commits, the previous file is deleted only after the new row commits, and a failed write leaves the previous cover.
- [ ] A successful upload publishes one playlist-changed event to the read audience; a refusal publishes none.
- [ ] The playlist read returns the new `coverUpdatedAt`; sync and the other playlist mutations leave it alone.
- [ ] Route tests cover the three formats, the limits, the access matrix, the media headers and the event.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
