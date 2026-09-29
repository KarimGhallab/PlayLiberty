# Expose the last sync run

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

`GET /api/v1/playlists/:id/sync-runs/latest` returns one run, the latest, and the body parses against
`SyncRunSchema`. Registered in `apps/server/src/http/buildApp.ts` beside the share and track routes, with
the service in `apps/server/src/sync/syncRunService.ts` following the shape of `tracks/trackService.ts`
and the outcome enum in `apps/server/src/sync/types.ts`.

Three outcomes, and the two 404s are separated by their problem code because the design record needs the
difference: `playlist_not_found` for a playlist that does not exist or that the account cannot see,
`sync_run_absent` for a visible playlist that has never synced, and the run itself otherwise. A run
that failed returns 200 with `status` failed and its `error`, and a run still `running` returns rather
than being hidden, because the sync summary's in-flight figure depends on it.

**A playlist the account cannot see answers 404, not 403, which diverges from `GET /tracks/:id/stream`.**
That route answers 403 and needs to: a client drawing the track row has to tell "you cannot play this"
from "this is not here", and the five `TrackFileStatus` values give it a case for each. A playlist screen
has no such case, and the design record's not-found state covers a playlist shared to the account and
since unshared, which a user reads as gone rather than as forbidden. So the existence of a playlist the
account cannot see is not confirmed. The divergence is deliberate and both routes say so in a comment,
because a reader who finds 403 in one and 404 in the other will otherwise assume one is a bug.

**The row mapping is the real work, and the first version of it was a lie.** The raw statement returns
the column names as written, so a first pass cast the row to the Drizzle `SyncRunRow` type, which
renamed nothing and put `undefined` into both timestamps. Drizzle maps its own column names on the way
out of its query builder, and a bare `prepare()` never goes through it. Six of the ten tests caught it,
all of them the ones parsing a 200 body, which is what the contract check in the ticket's verification
list was for. The row type is now declared from the statement and the mapping is the renaming, written
out field by field so it fails to compile if `SyncRunSchema` gains a field.

**The latest run is ordered by `started_at` with `rowid` breaking a tie.** Two runs can start inside the
same millisecond, and `started_at` alone leaves the pick unspecified, so the same request could report
different figures on two calls. No declared column is monotonic on insert, so the tiebreak is insertion
order. The test for it is not vacuous: removing `rowid desc` makes it fail, checked rather than assumed,
because an unspecified tie order is exactly the kind of thing a test passes by luck.

Ten tests in `apps/server/src/sync/syncRunRoutes.test.ts`, at the route rather than the service, because
what the ticket specified was status codes and problem codes and a body that parses. Two of them are
beyond the list and are there because the rule has a second half: a share grants the run at either
level, and the route cannot be read anonymously.

## Objective

`SyncRunSchema` is the entire data source for the sync summary and the sync error, and no route returns
it. The `sync_run` table already has the full column set and an index on `playlist_id`, and
`SyncRunRow` is already exported, so the data is modelled and unreachable. Add the route that returns a
playlist's most recent run, so the two playlist detail screens have something to bind to.

## Context

`docs/design-system/components/sync-summary.md` records this as an open dependency and says what
happens without it: "whether the playlist endpoint returns the last run at all is a server question,
recorded as a dependency in ticket `09` and deliberately not resolved here: if it does not, there is
nothing to bind to and no amount of design changes that." Ticket `13` settled the screen inventory and
left this as the one thing blocking both detail tasks.

The design record gives the run and the playlist different lifetimes, which is why the sync summary is
a component of its own and not three more lines on the header. That is the argument against folding the
run into `GET /playlists/:id`, and this ticket takes it.

Three cases have to be distinguishable, and the design record names all three: a playlist that has
never synced, a completed run, and a run that failed. A fourth is reachable and named too, a run still
`running`, because the sync summary's in-flight figure depends on it. "No run" is not an error and must
not read as one.

## Scope

- `apps/server/src/sync/`: a route file registering `GET /playlists/:id/sync-runs/latest`, following the
  shape of `apps/server/src/shares/shareRoutes.ts`.
- The row to schema mapping. The table is snake_case and the schema is camelCase, and the timestamps
  are stored as text, so this is real work rather than a spread.
- Authorization: the account must own, collaborate on, or hold a share on the playlist, the same rule
  `GET /tracks/:id/stream` already applies. A playlist that exists but is not visible to the account
  answers 404 rather than 403, so the route does not confirm the existence of a playlist it will not
  show.
- The two problem codes, `playlist_not_found` and `sync_run_absent`, which follow the snake_case
  vocabulary `apps/server/src/errors/problem.ts` and its callers already use.

## Do not

- Do not return history. One run, the latest, no pagination. Run history is not a product capability,
  and putting `PageQuerySchema` on this route would imply one.
- Do not fold the run into `GET /playlists/:id`. The two have different lifetimes, and a payload
  carrying both makes the empty state harder to reason about, because `lastSyncedAt` null with a run
  present is a reachable combination the design already names.
- Do not add a nullable envelope such as `{ run: SyncRunSchema | null }`. "This playlist has never
  synced" is `404` with a distinct problem code, because `ProblemSchema.code` is the mechanism this
  server already uses to separate causes at one status. An envelope creates a second shape for one
  value and every client branches on it forever.
- Do not start or drive a sync from this route. It reads.
- Do not change `SyncRunSchema` to make the route easier. If a field is missing, the run is modelled
  wrongly, and the fix belongs there rather than in the payload.

## Blocking edges

Blocks `17-design-the-playlist-detail`, which cannot be drawn against a payload that does not exist.

## Verification

- A test that a playlist with a completed run returns it, with the body parsing against
  `SyncRunSchema`.
- A test that a playlist whose only run failed returns it, with `status` failed and `error` non-null.
  The design record names this case as reachable, so it needs a test and not only a code path.
- A test that a playlist with no run answers `404` with `code: sync_run_absent`, and that a playlist
  which does not exist, or exists and is not visible to the account, answers `404` with
  `code: playlist_not_found`. Two codes at one status is the point of the shape.
- A test that a run still `running` is returned rather than hidden.
- `pnpm run build` and `pnpm run lint`.
