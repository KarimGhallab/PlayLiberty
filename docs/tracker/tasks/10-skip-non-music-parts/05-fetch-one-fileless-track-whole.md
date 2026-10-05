# 05: Fetch one fileless track whole

**What to build:** A new route lets an account that can write a playlist holding a track force that one track to
be fetched without trimming: it flips the track's recorded value to false and returns it to `pending`, so the
next pass downloads it whole. The bypass is offered only when the track has no stored file, because a stored
file is shared by every association and overwriting it would change every other playlist that references the
video. Healing an already-stored track stays an operator action on the media object. The route is authorized the
way retry is: the right follows the track, and a read collaborator, a stranger and a track no writable playlist
holds answer the same not-found.

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The route sets the track's recorded value false and returns it to `pending`, for a track with no stored file.
- [ ] The next pass downloads it whole: the adapter receives false and the download arguments carry no sponsorblock flag.
- [ ] A stored track is refused and left untouched.
- [ ] A read collaborator, a stranger and a track no writable playlist holds answer the same not-found.
- [ ] The request is refused without the client header.

**Verification:** the server route tests over a temporary database, `pnpm run build` and `pnpm run lint`.
