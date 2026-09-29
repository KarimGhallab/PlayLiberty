# Read a playlist

Status: agreed
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A playlist exists in the database and a client can be told it exists, but nothing can tell a client what is in
it. The route that would return a playlist's tracks does not exist at all, not even as a stub, while the
schema for exactly that response, carrying a track and where it came from and where it sits, is already part
of the shared contracts. The playlist detail screen, which is the one place stored tracks become audible, has
no data to draw itself from, and the library has a count it cannot reconcile against a list.

The problem is not only the missing route. What the route answers decides three things a client cannot
recover on its own: whether an empty playlist is an error or a state, whether a playlist the account cannot
see is absent or forbidden, and whether a track that belongs to another playlist can leak into this one.

## Solution

One route returns a playlist's tracks, each with its association's origin and position, ordered as the
playlist holds them. It is the only way into a track's metadata, it never returns a track the playlist does
not associate, and it answers the same way the playlist route and the latest-run route already do: a playlist
the account cannot see is not found, and a playlist that has simply never synced is an empty list with a
playlist beside it.

## User Stories

1. As a listener, I want to open a playlist and see its tracks, so that I can choose what to play.
2. As a listener, I want each track to show its title, duration and artwork, so that I recognise it.
3. As a listener, I want the tracks in the order the playlist holds them, so that the list means something.
4. As a listener, I want to see which tracks came from the source and which I added by hand, so that I know
   what a sync is about to reconcile.
5. As a listener, I want every track's state to be shown as a word as well as a colour, so that I can read
   the list without relying on colour.
6. As a listener, I want to see that a track is pending or downloading rather than have it silently absent, so
   that I know it is coming.
7. As a listener, I want to see that a track failed and why, so that I can decide whether to retry it.
8. As a listener, I want a track that has left the source to be marked as kept, so that I understand why it is
   still there.
9. As a listener, I want a track with no file to be visible but not playable, so that the list is honest about
   what I can hear.
10. As a listener, I want a track with no artwork to still be listed, so that a missing picture does not hide
    a song.
11. As a listener, I want a track with an unknown duration to still be listed, so that a missing number does
    not hide a song.
12. As a listener, I want a track whose failure reason is long to be readable rather than to break the row, so
    that an unusual failure does not break the screen.
13. As a listener, I want a playlist that has never synced to show an empty state rather than an error, so that
    I can tell "nothing yet" from "something is wrong".
14. As a listener, I want a playlist I no longer have access to to read as gone rather than as forbidden, so
    that a revoked share does not look like a fault.
15. As a read collaborator, I want to see the playlist's tracks, so that a share I was given is usable.
16. As a write collaborator, I want to see the playlist's tracks, so that I can curate what I was given.
17. As an account, I want a playlist belonging to somebody else to answer the same way as one that does not
    exist, so that the route does not confirm what I cannot see.
18. As an account, I want a track from another playlist never to appear in this one, so that playlists stay
    the boundary of what I see.
19. As an account, I want my own track to appear once even if it is in two of my playlists, so that a list is
    not inflated by my own arrangements.
20. As a listener, I want a long playlist to page rather than to arrive in one enormous response, so that the
    screen opens.
21. As a listener, I want to know how many tracks a playlist holds in total, so that I know when I have seen
    them all.
22. As a listener, I want a track's stored state to be decided by the server, so that both clients agree on
    what is playable without each guessing.
23. As a listener, I want the route to be a read, so that opening a playlist never changes anything.

## Implementation Decisions

- **The route is the obvious one, paginated with the query shape the contracts already define.** It accepts
  the existing page query and returns the existing page schema built over the existing playlist-track schema,
  which carries a track, an origin and a position. No contract changes, which is the point: the response
  shape was designed with the screen in mind and never needed.
- **A page is ordered by position, with a stable tiebreak.** Position is assigned by the features that create
  associations, so two associations in one run can share it, and a client that fetched the same page twice
  must not see the rows swap. The tiebreak is insertion order, which is monotonic, because no declared column
  on the association is.
- **Only associations decide membership.** The query joins through the association table and nothing else, so
  a track held by another playlist cannot appear here, and a track held by this playlist and another appears
  once. The store is server-wide and the view is not, and that is exactly the boundary the product draws:
  playlists are the only entry point to content.
- **A playlist the account cannot see answers `404`, never `403`.** The rule is the one the playlist route
  and the latest-run route already apply, decided there for the reason recorded beside it: a client rendering
  a playlist screen has no case for "you may not see this", and a route that answers forbidden for a
  playlist confirms that it exists. Visibility is the owner's account or any share on it.
- **A playlist that has never synced is an empty page with a total of zero, not an error.** The empty state
  is defined as a null last-synced time with a run present as a reachable combination, so an empty list is
  the expected first answer for a playlist that has just been created. The route never invents a placeholder
  track and never returns a problem document for an empty association set.
- **The route reports state and nothing else.** Every field it returns is a field of the track or the
  association as stored. It adds no derived flags, no counts, and no booleans about playability, because the
  playability rule is already one line for a client to apply and a second encoding of it is a second thing to
  keep in step. What a client derives, it derives from the same two status fields the design system already
  labels.
- **The total is the playlist's stored track count**, which moves in the same transaction as the association
  that changed it. The count is therefore the number of rows in the playlist, which is what a client needs to
  know when it has fetched every page.
- **The route is a read.** It creates nothing, mutates nothing, and requires no client header, because the
  edge has already authenticated the caller and the request changes nothing.
- **A missing thumbnail or duration is a value, not a gap.** Both fields are nullable in the contract and
  both are returned as null rather than omitted, so a client reads one shape and handles the null case
  explicitly instead of discovering an absent key.
- **A failure reason is returned as stored and bounded at the edges, not in the middle.** The field is a
  non-null string with no declared length, so the route returns what the download wrote and the design
  system's row is responsible for presenting it. No truncation happens here, because a truncated reason is a
  reason the user cannot act on.
- **No aggregate route is added.** A playlist screen needs the playlist, its tracks, and its latest run, and
  they are three reads of three resources that already exist. Combining them would be convenient and would
  make every write to any one of them invalidate one large payload, and no client has a stated need for a
  single round trip.
- **Binding constraints, not negotiable inside this spec:** the stored media is what the client plays, never
  the source; identity comes from the forwarded edge headers and fails closed; playlists are the only entry
  point, so there is no route that lists every track the instance holds; and no route in this surface mutates
  anything, so no request here carries the client header.

## Testing Decisions

- **One seam, at the highest point available.** The real app over a temporary database, exercised through
  HTTP injection, with accounts, playlists, tracks and associations seeded directly so the test states only
  what it is about.
- **What makes a good test here** is the response validated against the contract schema plus the rows that
  came back, never the shape of the query that produced them. A route test that asserts a join was used is a
  test of the implementation; one that asserts a track from another playlist is absent is a test of the
  boundary.
- **The cases that must exist:**
  - a playlist with associations returns them in position order, each with its origin and position;
  - an association with the same position as another returns in a stable order across two calls;
  - a track associated with another playlist does not appear;
  - a track associated with this playlist and another appears once;
  - a playlist with no associations returns an empty page with a total of zero and a successful status;
  - a playlist that does not exist answers `404`;
  - a playlist owned by another account with no share answers `404`;
  - an owner, a read collaborator and a write collaborator each receive the playlist;
  - a revoked share answers `404` from that moment, which is the same answer as never having had one;
  - every track status in the glossary's table is returned faithfully, including `unavailable` and a failed
    track with a reason;
  - a track with a null thumbnail and a null duration is returned with both null rather than omitted;
  - paging returns the requested window and the true total, and the last page is short rather than padded;
  - the response validates against the playlist-track page schema.
- **Prior art:** the existing server route tests, which build the real app over a temporary database, seed
  accounts directly, and validate responses against the contract schemas. The playlist route's own tests
  already cover the `404` for a playlist the account cannot see, and this route inherits that expectation
  rather than inventing a second one.

## Out of Scope

- Any route that lists every track in the instance. There is no global library view and there never will be
  one in v1.
- Any route that lists the playlists a track belongs to.
- Search, filtering, and sorting by anything but position.
- Derived playability flags, next and previous track pointers, and duration totals. A client derives what it
  needs from the status fields.
- An aggregate route that returns a playlist, its tracks and its latest run together.
- Moving a track's position, which is
  [`04-curate-a-playlist`](04-curate-a-playlist.md)'s business and is not in v1 at all.
- Anything about playing the tracks, which
  [`07-play-stored-audio`](07-play-stored-audio.md) owns.

## Further Notes

- This is the shortest spec in the set and the one with the most leverage: it blocks both clients, and every
  screen on either client needs it. It should be cut early even though it is small.
- The response shape, including the origin and the position, was already written into the shared contracts
  and has never been served. That is worth knowing before the ticket is cut, because it means the design
  question is settled and the work is a query and an authorisation check.
- The `404` rather than `403` choice is not this spec's. It was decided for the playlist route and recorded
  beside that decision, and reusing it here is the point: a client should not have to learn two rules about
  the same boundary.
- The empty page answer is the reason this spec is worth writing down at all. It is the one case where the
  obvious implementation, treating nothing as an error, would break a designed state that already exists.
