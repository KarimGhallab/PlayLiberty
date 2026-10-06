# 10: One artwork pipeline, the cover reuses the track's thumbnail

**State:** `resolved`
**Category:** `enhancement`

## Agent Brief

**Category:** enhancement
**Summary:** The playlist cover stops being a third-party URL and becomes the first track's stored
thumbnail, reached through the track's own route, with the sleeve standing in until the artwork lands. The
artwork step also writes a small derivative for the ambience tickets, and the playlist's `cover_url` goes
away.

**Current behavior:**
A playlist's cover is `cover_url`, the source's first entry thumbnail URL, written by the sync and rendered
straight by the client. It is the only artwork that leaves the instance, the only one the server cannot
gate, and the only one that can 404 into an empty box. A track's thumbnail is already stored beside the
audio, served through `GET /tracks/:id/thumbnail`, and referenced on the wire as `thumbnailPath`; its
remote `thumbnail_url` never crosses.

The cover's video id is the source's first entry, which in the common case is also the first track's video
id, and the worker already stores that thumbnail, deduplicated server-wide by video id. So a separate cover
image is a duplicate of one the pipeline already holds.

**Desired behavior:**
The playlist owns no image. It carries `coverTrackId`, the first association's track id, and the client
renders the existing `GET /tracks/:id/thumbnail` for it. The cover is therefore the first track's stored
thumbnail, fetched once for the track and shared, with no dedicated fetch, no second copy and no
third-party call from any client. The sleeve stands in whenever there is no artwork: no associations, the
first track not downloaded yet, or a first track that was skipped, failed or is source-unavailable.
`cover_url` is dropped from the column, the contract and the sync.

The artwork step also writes a small derivative beside the full image at fetch time, keyed by the video id,
and the thumbnail route serves it as `?size=small`. No new contract field: `thumbnailPath !== null` already
means the derivative exists.

Two consequences, both accepted:

- The cover's source moves from `source.entries[0]` to the playlist's first association. They differ only
  when the first entry is suppressed, in which case the cover follows the first surviving track.
- The cover arrives when the first track's audio and thumbnail land, not at sync time, so a fresh playlist
  shows the sleeve until then.

**Key interfaces:**

- `PlaylistSchema`: drop `coverUrl`, add `coverTrackId: identifier.nullable()`.
- The playlists table: drop `cover_url`.
- The playlist read resolves `coverTrackId` from the playlist's first association (lowest position), or null
  when it has none.
- The download worker's thumbnail step writes the full image and the small derivative together, best effort
  exactly as the full image is today: a failure never fails the track or the run.
- `GET /tracks/:id/thumbnail` gains a `size=small` variant served from the derivative, under the same
  access rule as the full image.
- The web `PlaylistHeader` renders the track thumbnail route from `coverTrackId` and falls back to the
  sleeve on a load failure.
- The sync stops writing `cover_url`.

**Acceptance criteria:**

- [ ] A playlist's cover renders its first track's stored thumbnail through the track route, and no client
      requests a third-party cover URL.
- [ ] A playlist with no associations, or whose first track has no stored thumbnail, draws the sleeve.
- [ ] A stored thumbnail whose image fails to load falls back to the sleeve, so no empty box.
- [ ] `coverTrackId` follows the first association by position, and is null when there is none.
- [ ] The artwork step writes the small derivative beside the full image, `?size=small` serves it under the
      same access rule, and `thumbnailPath !== null` implies the derivative exists.
- [ ] `cover_url` is gone from the column, the contract and the sync.
- [ ] Server tests cover the cover reference, the no-association and no-thumbnail sleeves, the derivative
      write and the small route; web tests cover the cover route, the sleeve fallback and the failed-load
      fallback.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The ambience that consumes the derivative (issues 07 and 09).
- Any dominant-colour extraction. The ground is the image itself, blurred.
- The track rows' grounds.

## Relation to issue 05

This supersedes issue 05's stored-cover approach: there is no separate cover to store. Issue 05's
empty-box half is subsumed here by the sleeve fallback on a failed image load.

## Outcome

Implemented. The playlist owns no image: `PlaylistSchema` carries `coverTrackId`, resolved on read from
the playlist's first association (batched for the list, single for the read), and the header renders the
track's own thumbnail route with the sleeve standing in for a missing or failed image. `cover_url` is gone
from the column (the initial migration), the contract and the sync.

The small derivative and its `?size=small` route were built and then dropped: the ambience grounds draw
the full image instead, so there is no downscale, no derivative file, and no `resizeThumbnail` in the
adapter.

Verified: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 347).
