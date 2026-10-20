# Keep the screens current

Status: resolved
Labels: `enhancement`

## Problem Statement

Every server feature in this set is asynchronous, and nothing decides how the web client learns what happened.
A sync answers `202` and finishes later; a download moves a track through three states after the response that
created it; a share can be revoked by somebody else. The scaffold fetches the playlist list once and never
again, so a person who pastes a playlist watches a screen that never changes, and a person whose session
expires watches a request fail with no way back. The plumbing exists, the query client exists, and the
behaviour does not.

The second problem is the one the server deliberately left open. [`01-sync-a-playlist`](01-sync-a-playlist.md)
adds no polling route and says a client learns the outcome from the latest-run route, which already exists and
already separates "no run" from "a failed run". Something has to decide how the client learns a change
happened, what it does when the answer is a refusal, and what the server's decision has no client half for.

## Solution

The web client keeps itself current by reading three resources and refetching them when the server says they
changed. One `GET /api/v1/events` stream per tab carries an event when a playlist's state moves, a track moves
through the download states, or a playlist, its associations or its shares change; the client invalidates the
reads the event names, so a settled library is a still screen and an idle instance is not asked anything.
Every mutation invalidates the reads it changed, so a rename, delete, add, remove, retry, share or sync shows
its result without a manual reload. An expired session is handled once per tab by navigating so the edge can
re-authenticate, and a second refusal is shown as the problem it is rather than reloading forever.

## Implementation Decisions

- **TanStack Query is the single owner of server state.** [The web stack](../../ARCHITECTURE.md#the-web-stack) chooses it, the scaffold wires it, and this
  spec is what it is for. No component fetches on its own, and no server value is copied into the Zustand store
  except playback state, which is the client's own. A second copy of a server fact is a second thing to keep in
  step, which is the mistake the whole contracts package exists to prevent.
- **The resources and their keys are fixed here.** The library reads the playlist page under `['playlists']`.
  The detail reads the playlist under `['playlist', id]`, its tracks under `['playlist', id, 'tracks']`, and its
  latest run under `['playlist', id, 'sync-run', 'latest']`. The shares of a playlist are
  `['playlist', id, 'shares']` and the directory is `['accounts']`. The keys are the invalidation surface, and
  naming them here is what lets the map below be exact rather than approximate.
- **The server pushes when a watched resource changes, and the client refetches.** One
  `GET /api/v1/events` stream per tab carries invalidation hints, not data: the server emits when a playlist's
  `syncStatus` moves, when a track's `fileStatus` moves through `pending` and `downloading` to `stored`,
  `failed` or `unavailable`, and when a playlist, its associations or its shares change. The client maps each
  event to the reads the mutation map below already names and invalidates them, so the freshness a screen needs
  arrives on the change rather than on a timer. There is no interval and no attempt count; a settled instance
  sends nothing. [Live updates use Server-Sent Events](../../ARCHITECTURE.md#live-updates-use-server-sent-events) owns the decision and the
  transport.
- **The connection is long-lived, and the client re-reads when it opens.** The server sends a heartbeat so an
  idle connection stays open and a dead one is noticed, and the client re-reads every query it holds the first
  time the stream opens and again on every reconnect, so a gap between the last event and the connection is
  closed without a timer. [Live updates use Server-Sent Events](../../ARCHITECTURE.md#live-updates-use-server-sent-events) owns the liveness
  and reconnect rules.
- **A read also refreshes when the window regains focus and when the connection returns.** TanStack Query's
  defaults do both, and they are kept: a person who leaves the tab and comes back, or whose laptop slept, gets
  the current answer rather than the one from before. This is the one refresh that is not tied to work in
  flight.
- **Every mutation invalidates the reads it changed, and nothing else.** The map, once:
- creating a playlist invalidates `['playlists']`;
- starting a sync invalidates `['playlist', id]`, `['playlist', id, 'sync-run', 'latest']` and
  `['playlist', id, 'tracks']`;
- rename and delete invalidate `['playlists']` and `['playlist', id]`, and delete also removes
  `['playlist', id]` from the cache so a deleted playlist does not linger;
- the batch add, remove and retry invalidate `['playlist', id, 'tracks']` and `['playlist', id]`, because the
  track count moves with the association;
- granting and revoking a share invalidates `['playlist', id]`, `['playlist', id, 'shares']` and
  `['playlists']`, because a collaborator's library changes too.
  The map is exhaustive by design: a mutation that invalidates nothing is a screen that shows the old answer.
- **No mutation is optimistic.** The server's answer is the state the screen shows, which is the same reason
  [`08-see-the-library`](08-see-the-library.md) does not draw a created playlist before the server returns it.
  An optimistic row would have to be reconciled against an id it does not have, and every mutation here already
  answers fast enough that the invalidation is the feedback.
- **The error state of a read is the screen's, and it is distinct from empty.** A failed playlist read renders
  the detail's error state, not an empty track list; a failed library read renders the library's error state,
  not the empty gallery. The `404` a revoked share produces is the "gone" state, not a fault.
- **A problem document is shown as the problem it is.** The client already parses `application/problem+json`;
  a screen shows the problem's title, and a mutation shows the message beside the control that caused it. The
  client does not invent a message for a status code it was given a document for, and it does not show a
  status number to a person.
- **Every mutation carries the client header, and no read does.** The architecture requires `X-PlayLiberty-Client` on
  every mutating request and forbids mutating on a `GET`. The scaffold's client already does this; this spec is
  the behavior that depends on it and the reason it must not regress.
- **An expired session is handled once per tab.** The client treats a `401` or an opaque redirect as "the edge
  must re-authenticate" and navigates to the current URL so the edge can run its flow. It records the attempt
  in the tab's session storage, and a second refusal in the same tab is surfaced as the problem rather than
  navigated again, because a second navigation is a reload loop with no exit. A successful response clears the
  record, so a session that expires later can re-authenticate. This is the client half of
  [`05-share-a-playlist`](05-share-a-playlist.md)'s revocation rule and of the edge's session, and it is the
  reason a broken edge does not make the tab unusable.
- **The client talks to one origin and no other.** Every request is same-origin under `/api/v1`, so nginx, or
  the Vite dev proxy, forwards it and no CORS is in play. In development the proxy stands in for the edge and
  injects the identity headers the server reads; in production the edge does. The client never sends an
  identity header of its own.
- **The transport is Server-Sent Events, and not a WebSocket.** One `EventSource` per tab, one-way, with the
  platform's own reconnection and no second protocol to secure.
  [Live updates use Server-Sent Events](../../ARCHITECTURE.md#live-updates-use-server-sent-events) owns the choice and the alternatives.
- **The detail screen composes three reads rather than one aggregate**, which
  [`03-read-a-playlist`](03-read-a-playlist.md) records. The playlist gives the header and the state, the tracks
  give the list, and the latest run gives the summary or the error. They are three resources with three
  lifetimes, and invalidating one does not invalidate the others.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the client header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- Playback, the queue and the audio element, which [`07-play-stored-audio`](07-play-stored-audio.md) owns.
- Any push channel, websocket or server-sent event.
- Offline caching and a service worker. Offline is out of scope in v1.
- Optimistic updates, and any state the server has not confirmed.
- The wording of a screen's error state, beyond the rule that a problem's title is what is shown.
- The server's routes and the shape of their answers, which the other specs own.
