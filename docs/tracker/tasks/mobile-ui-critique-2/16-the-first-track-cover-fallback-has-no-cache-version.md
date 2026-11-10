# 16: The first-track cover fallback has no cache version

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

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

The root build, lint and unit run follows in the batch for this
session.
