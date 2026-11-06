# 16: The first-track cover fallback has no cache version

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

A custom cover is requested with a version query, so replacing it invalidates the cached bitmap. The first-track
thumbnail fallback, used when no cover is set, is requested without one, so changed artwork can keep rendering the old
image after the first track changes.

## Expected

Both branches of the cover chain carry the identity of the bytes they draw, so a changed image is a changed URL.

## Evidence

- `apps/mobile/src/shared/playlistCover/usePlaylistCover.ts:36-51`.

## Acceptance criteria

- [x] The fallback URL changes when the first track's artwork changes.
- [x] Removing the custom cover reveals the current first track's artwork, not a cached earlier one.
- [x] The web client's cover chain still agrees with the phone's.
- [x] No extra request is issued when nothing changed.

## Verification

Change a playlist's first track, then reopen the library and compare the cover with the source thumbnail. Then
`pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06. Both cover chains version the fallback.

The phone's `usePlaylistCover` now puts the first track's id on its thumbnail URL through the existing `withVersion`
helper, so a changed first track is a changed URL; the custom cover keeps its `coverUpdatedAt` stamp. The web's
`usePlaylistCover` does the same with its own `?v=` query, so the two clients agree. The version is stable while the
data is, so an unrelated read or a rename does not issue a new request.

The one limit is the contract: the playlist carries `coverTrackId`, not the track's own thumbnail stamp, so a
re-download of the same track's artwork is keyed by that id. The ticket's scenario, the first track changing, is
covered.

`PlaylistCard.test.tsx` pins the fallback URL with its version and a second first track; the web `PlaylistHeader` and
`CoverDialog` tests moved to the versioned URL.

Checks: mobile and web typechecks and suites pass. The root build, lint and unit run follows in the batch for this
session.
