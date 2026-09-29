# Add a track count to the playlist schema

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

`trackCount` is on `PlaylistSchema` and on the `playlist` table, and `GET /playlists` and
`GET /playlists/:id` both return it. The two routes were `sendNotImplemented` stubs when this ticket
started and no other ticket owned them, so they are implemented here: without them the field would be
carried by nothing, which is not a working end state however thin.

**The count is a stored column, not a grouped query.** It began as a `count(*)` grouped over the page's
ids, and the decision changed to a column on the playlist, read straight off the row. The library reads
it on every row of every page and it changes only when an association does, which is the shape a cached
total suits, and the read is now one statement fewer on the route every client hits first. The cost is
that the column can drift, and the rest of this is about not letting it.

**One function can change it.** `apps/server/src/playlists/associationService.ts` holds
`addAssociation` and `removeAssociation`, and each moves the count in the same transaction as the row it
counts. That is the whole of the write surface, so a future sync or track route has one place to call
and cannot forget. The transaction matters as much as the arithmetic: a crash between the insert and the
increment would leave the count permanently low with nothing to notice, because no read recomputes it.
The decrement is `max(track_count - 1, 0)`, so a count can never go negative even if rows were removed
behind the helpers. Adding an association that is already there is `already_present` and does not
increment, which the unique index on `(playlist_id, track_id)` would have enforced anyway.

**The migration backfills, and that is tested.** `drizzle-kit generate` produced the `ALTER TABLE` and
the snapshot; the `UPDATE` that gives existing playlists their real count is hand written, because the
tool knows nothing about existing rows. Without it every playlist that already had associations would
read 0 forever. `src/db/migrate.test.ts` builds a database at the state before the migration, seeds it
with raw SQL, and lets the real migrator apply it. The seed is raw on purpose: the Drizzle schema object
describes the database after the migration, so using it to write to a database that has not had the
migration applied fails on a column that does not exist yet, which is how the test proved it was really
at the old schema. Removing the backfill makes the test fail, checked rather than assumed.

**One thing is true today and will change: every playlist's count is 0 in production.** Nothing writes
associations yet. The sync, `POST /playlists/:id/tracks`, `DELETE /playlists/:id/tracks/:trackId` and the
orphan prune are all unimplemented stubs, so the column has no writer outside tests until the first of
them lands. The library will render a row of zeros until then, which is a fact `16-design-the-library`
draws against and should be told before it starts.

**The list is ordered newest first with `rowid` breaking a tie**, so a page boundary cannot repeat or
skip a playlist between two requests. The library's visual order belongs to the design record and may
disagree; if it does, that ordering clause is the line that changes with it, because a list whose order
is not stable cannot be paged.

**A playlist the account cannot see is `404 playlist_not_found`, not 403**, the same disclosure choice
ticket 14 made for the sync run route, so the two playlist routes cannot disagree with each other.

## Objective

`PlaylistSchema` carries no count, and the library cannot show how big a playlist is without fetching
every playlist's tracks. Add `trackCount` to the schema and compute it server-side, so the two library
screens can label each row.

## Context

The playlist detail already gets away with a client-side count, because the client is holding the
track list it is counting. The library is not in that position: it holds playlists and nothing else,
so a count there is either an N+1 or a contract change. Ticket `13` settled that the library shows a
count, and this is the ticket that makes the statement true.

`playlist_owner_idx` is on `ownerAccountId`, which is the index the account-scoped library query
already needs, so the count is a grouped join on the page's ids rather than a scan.

**The field is a total and not a promise of playability, and that definition has to travel with it.**
`TrackSchema.fileStatus` runs pending, downloading, stored, failed and unavailable, so a playlist of
300 associations with 290 still pending has a count of 300 and plays four songs. A "playable" count
would be an aggregate of an aggregate, is not what anyone asked for, and is not added here.

## Scope

- `packages/contracts/src/schemas.ts`: `trackCount` on `PlaylistSchema`, a nonnegative integer. It is
  not nullable, because a playlist with no associations has a count of zero and that is a real answer
  rather than a missing one.
- The playlist row to schema mapping in `apps/server/src/playlists/`.
- `GET /playlists`: one grouped count query for the page's ids, not a count per playlist. A per
  playlist query here is a 50 request page and the route is the one every client hits first.
- `GET /playlists/:id`: the same count, single row, same definition.

The two routes above were stubs and the mapping did not exist when this ticket started, so all three
were built here. The count query line is superseded by the Outcome: it is a stored column now, and what
replaced the N+1 guarantee is that one function owns every write to it.

## Do not

- Do not add a playable count, or a count of stored tracks. Two counts on one row is a question every
  client has to answer and no user asked.
- Do not exclude `unavailable` tracks or remote-removed ones from the count. Every association counts,
  including the ones the source has dropped, because they are still rows the user can see in the list
  and a count that disagrees with the list is worse than no count.
- Do not make it nullable. Zero is the answer for a playlist that has never synced, and that playlist
  is the one the empty state is about.
- Do not derive it from the client anywhere, and do not keep a client-side count as a fallback. Two
  sources for one number is how they start disagreeing.

## Blocking edges

Blocks `16-design-the-library`, which draws a count on every row and cannot measure a row that has no
field behind it.

## Verification

- A contract test asserting `trackCount` is a nonnegative integer and that a playlist with no
  associations serializes as 0 rather than null.
- A test that the count equals the number of associations on the playlist, including associations whose
  track is `unavailable` or `sourceStatus` removed.
- A test that `GET /playlists` issues one grouped count for the whole page rather than one query per
  row, so the property is asserted rather than assumed. If the test harness cannot see the query
  count, assert the shape of the SQL instead and say which in the test name.
- `pnpm run build` and `pnpm run lint`.
