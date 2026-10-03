# 03: Skip what cannot be played

**What to build:** Nothing on screen lies about what can be heard. A track is playable exactly when its stored
file exists, which the track's file status says, and a track that is not playable has no play control and is not
put in a queue built from its playlist. A queue entry whose file is gone when it is reached is dropped and
playback continues to the next one, and a track that fails to load mid-queue behaves the same, so one broken
track ends nothing. A track that is not found is dropped and the queue advances, which is what a revoked share
or a pruned track looks like. A refusal because the session has expired is not a playback error and is never
shown as a broken track: it takes the client to the edge's sign-in through the client's own re-authentication
path.

**Blocked by:** [`01`](01-build-the-queue-and-play-it.md), [`02`](02-the-audio-element-and-the-browser-controls.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A track whose file status is not stored has no play control and is not in a queue built from its playlist.
- [x] A queue entry whose file has gone when it is reached is dropped and playback advances.
- [x] A track that fails to load mid-queue is dropped and playback advances.
- [x] A track that is not found is dropped and playback advances.
- [x] An expired session is not presented as a playback error, and triggers the client's re-authentication path instead.
- [x] A track that has left the source but is still stored plays.

## Outcome

Playability is decided in one place and enforced in three.

**One filter, drawn in the mapper.** `toPlayerTracks` now keeps only associations whose `fileStatus` is `stored`, so a queue can never hold an entry the list would not offer, and the list and the queue agree by construction rather than by two call sites remembering the same rule. The map carried a comment saying it was deliberately total; that comment was the thing this ticket supersedes, and it is gone. Filtering on `fileStatus` and not on `sourceStatus` is the whole point of the product: a video removed from YouTube still has a stored file, and the last checkbox is exactly that case.

**The list draws no control for an unplayable track.** `PlaylistDetailPage` renders the play button only when `fileStatus === TrackFileStatus.Stored` and the title as plain text otherwise, so the control is absent rather than disabled. The presentation here is still ticket 04's; what ticket 03 owns is that the button's presence is the server's answer, not the client's guess.

**One store action advances past whatever is gone.** `dropAndAdvance(id)` removes the entry and, when it was the current one, moves to the entry now at that index and keeps playing; at the end it stops and resets, the same answer `advance` gives, rather than leaving the cursor on a track that no longer exists. Removed when it was not current, it is a plain removal. This one action covers "file gone", "failed to load" and "not found", because all three end in the same place and differ only in how they were learned.

**The element cannot say why it failed, so the route is asked.** An `<audio>` element reports a load failure as a `MediaError` and never the HTTP status: Chromium maps `401`, `403`, `404` and `409` to the same one or two codes. `PlayerAudio` therefore handles the `error` event by classifying it, and `classifyStreamFailure` re-asks the stream route through the client's own request path. The probe is a `HEAD`, so it is a status and no media, and it runs only after a load already failed, so a playback that succeeds makes no request of its own. `send` inside the client already owns the re-authentication guard, so a `401` or an opaque redirect has fired that guard by the time the rejection reaches the classifier; the statuses `403`, `404` and `409` classify as `Gone` and drop; everything else, including a `5xx` and a network rejection, classifies as `Unknown` and stops without dropping, so a network blip does not skip music. `Session` does nothing at all: the session is not a track fault, which is what keeps it out of the queue's failures. The `failedId` is captured before the probe and compared against the store's current id when it resolves, so a probe that lands after the listener has moved on does not touch the track they are on now.

**The probe is a `HEAD` and not a ranged `GET`.** The first cut used `Range: bytes=0-0` and cancelled the body, which is a status check with a stray byte and a stream teardown the test environment stalled on. `HEAD` is the request whose whole meaning is the status and the headers, Fastify exposes it for the route, and there is no body to cancel.

**What the browser and the fakes proved.** The classifier is covered for `404`, `403`, `409`, `503`, a network failure and a `401`, the last asserting the re-authentication guard was reached rather than the track being called broken; jsdom's `location` is frozen, so the navigation itself is observed through the client's re-auth flag instead. `PlayerAudio` is covered for a `404` that drops and advances, a network failure that keeps the track and stops, and a `401` that keeps the queue and the listener. `toPlayerTracks` is covered for the four other file statuses, for the playlist stamp, and for a removed-but-stored track that still plays. The two store-path cases report the same action through the failed element.

Tests: a new `streamFailure.test.ts` (six: `404`, `403`, `409` are gone; `503` and a network failure are unknown; a `401` is a session and reaches the re-auth guard), six added to `PlayerAudio.test.tsx` (a gone track drops and advances; an unclassified failure stops and keeps the track; an expired session keeps the queue), three added to `playerStore.test.ts` (`dropAndAdvance` continues past the current track, stops at the last one, and only removes a track that is not current), a new `playerTracks.test.ts` (only stored survives, in order; the playlist is stamped; a removed-but-stored track stays) and one added to `PlaylistDetailPage.test.tsx` (no play control for a pending track).

Verification: `pnpm run test:unit` (224 server, 114 web, 14 ui-foundation, 14 youtube, 3 tokens), `pnpm run build`, `pnpm run lint`, `pnpm run script:code-circular-dependencies` (121 files, 0 circular) and `pnpm run design:check`, plus `pnpm run test:e2e` (5 passed). No em dashes. Not committed.
