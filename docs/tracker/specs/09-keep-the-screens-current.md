# Keep the screens current

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

Every server feature in this set is asynchronous, and nothing decides how the web client learns what happened.
A sync answers `202` and finishes later; a download moves a track through three states after the response that
created it; a share can be revoked by somebody else. The scaffold fetches the playlist list once and never
again, so a person who pastes a playlist watches a screen that never changes, and a person whose session
expires watches a request fail with no way back. The plumbing exists, the query client exists, and the
behaviour does not.

The second problem is the one the server deliberately left open. [`01-sync-a-playlist`](01-sync-a-playlist.md)
adds no polling route and says a client learns the outcome from the latest-run route, which already exists and
already separates "no run" from "a failed run". Something has to decide how often the client asks, when it
stops asking, and what it does when the answer is a refusal, or the server's decision has no client half.

## Solution

The web client keeps itself current by reading three resources and refreshing them only while they are
changing. While a playlist is syncing, or a track in the visible list is pending or downloading, the client
refetches on a short interval; when nothing is in flight it stops, so a settled library is a still screen and
an idle instance is not polled. Every mutation invalidates the reads it changed, so a rename, delete, add,
remove, retry, share or sync shows its result without a manual reload. An expired session is handled once per
tab by navigating so the edge can re-authenticate, and a second refusal is shown as the problem it is rather
than reloading forever.

## User Stories

1. As a listener, I want to paste a playlist and watch it fill, so that a quiet screen is not a broken one.
2. As a listener, I want the counts and the state to update when a sync finishes, so that I do not have to
   reload to see the result.
3. As a listener, I want a track to move from pending to downloading to playable on its own, so that the list
   tells me what is happening.
4. As a listener, I want the list to stop refreshing once everything is settled, so that the app is not doing
   work I did not ask for.
5. As a listener, I want the library and the playlist to agree, so that two screens are not two versions of one
   fact.
6. As a listener, I want a rename, a delete, a removal or a retry to show up at once, so that my action has a
   visible result.
7. As a listener, I want a share I grant or revoke to change the library at once, in both directions.
8. As a listener, I want the latest run's figures and its error to appear without a reload, so that the sync
   summary and the sync error are live rather than a snapshot.
9. As a listener, I want a failed read to say so rather than to look empty, so that "nothing there" and
   "something broke" are different.
10. As a listener, I want a playlist I have lost access to to read as gone, so that a revoked share is not a
    fault.
11. As a listener, I want my session to be re-established when it has expired, so that I am not stuck on a
    screen that will not load.
12. As a listener, I want an expired session not to turn into a reload loop, so that a broken edge does not
    make the tab unusable.
13. As an account, I want every mutation to carry the client header and pass the origin check, so that another
    site cannot change my library.
14. As an account, I want a refusal to be shown as the problem the server sent, so that the message I read is
    the one the server wrote.
15. As an operator, I want the client to poll only while work is in flight, so that an idle instance is not
    answering a request a second forever.

## Implementation Decisions

- **TanStack Query is the single owner of server state.** ADR 0005 chooses it, the scaffold wires it, and this
  spec is what it is for. No component fetches on its own, and no server value is copied into the Zustand store
  except playback state, which is the client's own. A second copy of a server fact is a second thing to keep in
  step, which is the mistake the whole contracts package exists to prevent.
- **The resources and their keys are fixed here.** The library reads the playlist page under `['playlists']`.
  The detail reads the playlist under `['playlist', id]`, its tracks under `['playlist', id, 'tracks']`, and its
  latest run under `['playlist', id, 'sync-run', 'latest']`. The shares of a playlist are
  `['playlist', id, 'shares']` and the directory is `['accounts']`. The keys are the invalidation surface, and
  naming them here is what lets the map below be exact rather than approximate.
- **The client refreshes only while something is changing.** A query is given an interval when its own answer
  says work is in flight and no interval when it says settled:
  - the playlist query and the latest-run query refresh while the playlist's `syncStatus` is `syncing`;
  - the tracks query refreshes while any track in the fetched page is `pending` or `downloading`, because those
    are the two states the download worker moves on its own;
  - the library refreshes while any visible playlist is `syncing`.
    A `stored`, `failed` or `unavailable` track, and an `idle` or `error` playlist, are settled: the interval is
    off and the screen is still until a person acts. _Decided here:_ the alternative, one global interval, polls
    a settled instance forever, and the alternative, a fixed number of attempts, gives up on a long download.
- **The interval is short and the stop condition is the data, not a counter.** The work being watched is a
  download that takes seconds and a sync that takes longer, so the interval is a few seconds; what ends it is
  the answer itself. There is no maximum attempt count, because a stalled sync would then stop being watched
  while it is still running, and the design system has a state for an active run that must keep updating.
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
  not the empty gallery. The `404` a revoked share produces is the "gone" state the design records already name,
  not a fault.
- **A problem document is shown as the problem it is.** The client already parses `application/problem+json`;
  a screen shows the problem's title, and a mutation shows the message beside the control that caused it. The
  client does not invent a message for a status code it was given a document for, and it does not show a
  status number to a person.
- **Every mutation carries the client header, and no read does.** ADR 0006 requires `X-PlayLiberty-Client` on
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
- **There is no push, no websocket, and no server-sent event.** The server's surfaces are reads and mutations,
  and the freshness the product needs is seconds, not milliseconds. A stream of updates would be a second
  protocol to build, secure and test for a cadence a poll already meets.
- **The detail screen composes three reads rather than one aggregate**, which
  [`03-read-a-playlist`](03-read-a-playlist.md) records. The playlist gives the header and the state, the tracks
  give the list, and the latest run gives the summary or the error. They are three resources with three
  lifetimes, and invalidating one does not invalidate the others.
- **Inherited constraints are owned by the ADRs and not restated here:** identity from the forwarded edge headers and fail-closed ([`0003`](../../adr/0003-identity-via-pangolin-forwarded-headers.md)), and the client header with the origin check ([`0006`](../../adr/0006-csrf-defense.md)).

## Testing Decisions

- **The seam is the query client with a mocked network.** The screens are rendered against a `QueryClient` and
  an MSW server, so what is asserted is the requests the client makes and the state the screen reaches, never
  the internals of a hook. The player's own tests are
  [`07-play-stored-audio`](07-play-stored-audio.md)'s and are not repeated here.
- **What makes a good test here** is the behavior over time: a query that refreshes while a state says running
  and stops when it does not. A test that asserts a hook was called is a test of the wiring; one that advances
  the clock and asserts a second request happened only while the answer said `syncing` is a test of the
  feature. Fake timers are the seam for the interval, and the mocked network is the seam for the answers.
- **The cases that must exist:**
  - a playlist in `syncing` causes the playlist, tracks and latest-run queries to refresh, and the refreshing
    stops once the playlist is `idle`;
  - a page containing a `pending` track refreshes, and one where every track is `stored`, `failed` or
    `unavailable` does not;
  - the library refreshes while a visible playlist is `syncing` and is still otherwise;
  - creating a playlist invalidates the library and the new item appears from the server;
  - starting a sync invalidates the playlist, its run and its tracks;
  - rename, delete, the batch add, remove and retry each invalidate the reads the map names;
  - granting and revoking a share invalidate the playlist, its shares and the library;
  - a failed read renders the error state and an empty read renders the empty state, and the two differ;
  - a `404` from a revoked share renders the gone state rather than an error;
  - a mutation without the client header is refused by the server, and the client always sends it;
  - the first `401` in a tab navigates to the current URL, a second `401` in the same tab is surfaced as a
    problem and does not navigate again, and a successful response clears the record;
  - a problem document's title is what a person sees, and no raw status number is.
- **Prior art:** the scaffold's API client already implements the same-origin request, the client header on
  mutations, the problem parsing and the re-authentication guard, and the web client's library test already
  renders through a query provider against a mocked network. This spec is the behavior those pieces are for,
  and its tests are the ones that would have caught the reload loop the guard exists to prevent.

## Out of Scope

- Playback, the queue and the audio element, which [`07-play-stored-audio`](07-play-stored-audio.md) owns.
- Any push channel, websocket or server-sent event.
- Offline caching and a service worker. Offline is out of scope in v1.
- Optimistic updates, and any state the server has not confirmed.
- The wording of a screen's error state, which the design records own, beyond the rule that a problem's title
  is what is shown.
- The server's routes and the shape of their answers, which the other specs own.
