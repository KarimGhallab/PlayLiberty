# Read a playlist

Status: resolved
Labels: `enhancement`

## Problem Statement

The library route already answers with the playlists an account can see, and nothing can tell a client what is
inside one. `GET /playlists/:id/tracks` does not exist at all, not even as a stub, while the schema for
exactly that response, carrying a track and where it came from and where it sits, is already part of the
shared contracts. The playlist detail screen, which is the one place stored tracks become audible in the web
client, has no data to draw itself from, and the library has a count it cannot reconcile against a list.

The problem is not only the missing route. What the route answers decides three things a client cannot
recover on its own: whether an empty playlist is an error or a state, whether a playlist the account cannot
see is absent or forbidden, and whether a track that belongs to another playlist can leak into this one.

## Solution

One route returns a playlist's tracks, each with its association's origin and position, ordered as the
playlist holds them. It is the only way into a track's metadata, it never returns a track the playlist does
not associate, and it answers the same way the playlist route and the latest-run route already do: a playlist
the account cannot see is not found, and a playlist that has simply never synced is an empty list with a
playlist beside it.

## Implementation Decisions

- **The route is the obvious one, paginated with the query shape the contracts already define.** It accepts
  the existing page query and returns the existing page schema built over the existing playlist-track schema,
  which carries a track, an origin and a position. No contract changes, which is the point: the response shape
  was designed with the screen in mind and never needed.
- **A page is ordered by position, with a stable tiebreak.** Position is assigned by the features that create
  associations, so two associations in one run can share it, and a client that fetched the same page twice
  must not see the rows swap. The tiebreak is insertion order, which is monotonic, because no declared column
  on the association is. The playlist list route already uses the same qualified-rowid tiebreak for the same
  reason, and this route follows it rather than inventing a second one.
- **Only associations decide membership.** The query joins through the association table and nothing else, so
  a track held by another playlist cannot appear here, and a track held by this playlist and another appears
  once. The store is server-wide and the view is not, and that is exactly the boundary the product draws:
  playlists are the only entry point to content.
- **A playlist the account cannot see answers `404`, never `403`.** The rule is the one the playlist route and
  the latest-run route already apply, decided there for the reason recorded beside it: a client rendering a
  playlist screen has no case for "you may not see this", and a route that answers forbidden for a playlist
  confirms that it exists. Visibility is the owner's account or any share on it, and the shared access helpers
  already implement it.
- **A playlist that has never synced is an empty page with a total of zero, not an error.** The empty state is
  defined as a null last-synced time with a run present as a reachable combination, so an empty list is the
  expected first answer for a playlist that has just been created. The route never invents a placeholder track
  and never returns a problem document for an empty association set.
- **The route reports state and nothing else.** Every field it returns is a field of the track or the
  association as stored. It adds no derived flags, no counts, and no booleans about playability, because the
  playability rule is already one line for a client to apply and a second encoding of it is a second thing to
  keep in step. What the web client derives, it derives from the same two status fields the contracts
  already define.
- **The total is the playlist's stored track count**, which moves in the same transaction as the association
  that changed it, in the association service that already exists. The count is therefore the number of rows in
  the playlist, which is what a client needs to know when it has fetched every page.
- **The route is a read.** It creates nothing, mutates nothing, and requires no client header, because the edge
  has already authenticated the caller and the request changes nothing.
- **A missing thumbnail or duration is a value, not a gap.** Both fields are nullable in the contract and both
  are returned as null rather than omitted, so a client reads one shape and handles the null case explicitly
  instead of discovering an absent key.
- **A failure reason is returned as stored and bounded at the edges, not in the middle.** The field is a
  non-null string with no declared length, so the route returns what the download wrote and the design
  system's row is responsible for presenting it. No truncation happens here, because a truncated reason is a
  reason the user cannot act on.
- **No aggregate route is added.** The detail screen needs the playlist, its tracks, and its latest run, and
  they are three reads of three resources that already exist or are specified here and in
  [`01-sync-a-playlist`](01-sync-a-playlist.md). Combining them would be convenient and would make every write
  to any one of them invalidate one large payload, and no client has a stated need for a single round trip.
- **The web client reads this route the way it reads the library.** The page it fetches is the list it renders,
  and it refetches while a sync or a download is making the list change. The loop belongs to
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md).
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the stored media as the source of truth ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)).

## Out of Scope

- Any route that lists every track in the instance. There is no global library view and there never will be one
  in v1.
- Any route that lists the playlists a track belongs to.
- Search. A filter and a sort by date are [`12-sort-and-filter-the-track-list`](12-sort-and-filter-the-track-list.md)'s
  business.
- Derived playability flags, next and previous track pointers, and duration totals. The client derives what it
  needs from the status fields.
- An aggregate route that returns a playlist, its tracks and its latest run together.
- Moving a track's position, which is [`04-curate-a-playlist`](04-curate-a-playlist.md)'s business and is not
  in v1 at all.
- Anything about playing the tracks, which [`07-play-stored-audio`](07-play-stored-audio.md) owns.
- The client's polling and invalidation, which
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md) owns.
