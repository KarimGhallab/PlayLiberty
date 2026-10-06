# 05: A dead cover leaves an empty box and calls Google

**State:** `resolved`
**Category:** `bug` (the empty box) with an `enhancement` half (the durable stored cover)

## Agent Brief

**Category:** bug (the empty box) with an enhancement half (the durable stored cover)
**Summary:** A playlist's cover is a third-party URL rendered directly, so a removed video's 404 leaves an
empty box and every view calls Google from a private instance. Store the cover beside the media like a track
thumbnail, serve it locally, and fall back to the sleeve when an image fails to load.

**Current behavior:**
`Playlist.coverUrl` is the source's remote `https://i.ytimg.com/...` URL, written at sync time and rendered
directly by the playlist header. The no-art sleeve is chosen from `coverUrl === null` alone, so a non-null
URL that 404s (the removed-video case) draws nothing: no image and no sleeve. The instance also makes a
third-party request for every cover. Tracks do not have this problem: the download worker stores a thumbnail
beside the audio and the client renders the local `/tracks/:id/thumbnail` route.

**Desired behavior:**
The playlist cover follows the track thumbnail's pipeline. When a playlist is synced, its cover bytes are
fetched and stored beside the media, and the playlist records the stored path. The client renders the stored
cover through a local, access-gated route and never requests a third-party URL. A cover fetch is
best-effort: a failure leaves the playlist without a stored cover and never fails the sync, the run or the
audio, exactly as a thumbnail failure does not fail a track. A playlist with no stored cover draws its
sleeve, and a stored cover that fails to load also falls back to the sleeve rather than an empty box. Prune
removes a playlist's stored cover with the playlist.

**Key interfaces:**

- `PlaylistSchema` gains a stored-cover indicator mirroring `TrackSchema.thumbnailPath` (call it
  `coverPath`): the client renders the local route when it is non-null and the sleeve otherwise. The remote
  cover URL becomes a server-side fetch source, as `thumbnailUrl` is; the client must not render it.
- The playlists table gains a `cover_path` column mirroring `tracks.thumbnail_path`, beside the existing
  remote URL, mirroring `thumbnail_url`.
- Media paths gain a covers directory and a `coverRelativePath` keyed by the playlist id, mirroring
  `THUMBNAILS_DIRECTORY` and `thumbnailRelativePath`.
- A local route serves the stored cover, mirroring `GET /tracks/:id/thumbnail`: access-gated by the
  playlist's own read rule, 404 when there is no stored cover.
- The cover fetch reuses the source adapter's thumbnail fetch and lives where the source's cover URL is
  known; a failure is logged and swallowed like the thumbnail fetch's.
- The header's cover rendering gains a per-image load-failure state that flips it to the no-art sleeve; it
  resets when the playlist changes.

**Acceptance criteria:**

- [ ] Syncing a playlist stores its cover beside the media and records the stored path; a failed cover fetch
      leaves the playlist stored and the sync completed.
- [ ] The client renders the stored cover through the local route for both header arrangements, and no
      rendered markup or request points at a third-party cover URL.
- [ ] A playlist with no stored cover draws its sleeve; a stored cover whose image fails to load also draws
      the sleeve, not an empty box.
- [ ] The cover route is access-gated like the playlist read and answers 404 when the playlist has no stored
      cover.
- [ ] Prune removes a playlist's stored cover with the playlist.
- [ ] Server tests cover the stored cover, the best-effort failure, the route and its access, and the prune;
      web tests cover the local route, the sleeve for no stored cover, and the failed-load fallback.
- [ ] The playlist header's design record describes the failed-load fallback and the stored route.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass, and the e2e journey still passes.

**Out of scope:**

- The track row's and player bar's thumbnails, which already render the local route.
- A backfill for playlists synced before the change; they draw their sleeve until their next sync stores a
  cover.
- Localization. The new copy stays plain English like the surrounding code; wiring it into the catalog
  belongs to spec 11.

## Outcome

Resolved by
[`10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail`](10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail.md).
The empty-box half is the sleeve fallback on a failed image load, now in `PlaylistHeader`; the durability
half is superseded, because the cover is the first track's stored thumbnail, so there is no separate cover
to store and no third-party request from any client.

## Observed

The cover is the playlist's `coverUrl`, a `https://i.ytimg.com/vi/<id>/hq.jpg` URL, rendered whenever it
is non-null:

- [`PlaylistHeader.tsx:649-655`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.tsx)
  (row) and `613-619` (card): `coverUrl === null ? null : <img src={coverUrl} alt="" />`.
- The no-art sleeve is gated on `coverUrl === null`, not on the image loading.

When the URL exists and the image 404s (exactly the removed-video case the product is built around), the
`<img>` fails and leaves an empty box. The library also makes a third-party request to Google from a
private instance.

## Expected

A cover that fails to load falls back to the sleeve the way a null cover does (`onError` toggles to
no-art), so a dead thumbnail is not an empty box. Longer term, the cover is as durable as the track: stored
beside the audio like the track thumbnail, so a removed video never removes the artwork either.

## Evidence

- Live, 2026-10-05: the three seeded playlists requested `i.ytimg.com` covers and all three 404'd, leaving
  the box empty (the browser console logged the three 404s).
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Priority Issue P2.
