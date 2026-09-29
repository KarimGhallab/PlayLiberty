# Expose a playlist's access on the schema

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

`access` and `hasShares` are on `PlaylistSchema`, and both playlist routes return them.
`packages/contracts/src/schemas.ts` carries the two, `PlaylistAccess` is derived and exported,
and `toPlaylistView` in `apps/server/src/playlists/playlistService.ts` takes them as arguments.
Ten route tests and six contract tests cover them.

**The account's own share rides along on the page query, so `access` is free per row.** The list
route left-joins `share` constrained to the requesting account, which the unique index on
`(playlist_id, account_id)` bounds to at most one row per playlist, so the page cannot grow. The
same join serves the single-playlist route. Only `hasShares` needs a query of its own, because it
is about any share rather than the reader's.

**`rowid` had to be qualified.** The join puts a second table in the query, and the share table
has a rowid too, so the bare `rowid` this query ordered by became ambiguous. It is
`"playlist".rowid` now, with a comment saying why, because that line otherwise looks like noise
somebody would tidy away.

**Where the ticket was wrong, and the code is not.** The ticket said writing `access` as a union
over `ShareLevel` would make a new level a compile error. It does the opposite: the union makes the
schema _accept_ a new level, which is right, because a new level of sharing is a new level of
access. The decision is forced one layer down instead, by an exhaustive switch in
`accessFromShareLevel`. Adding `ShareLevel.Admin` and building fails at
`Type 'ShareLevel.Admin' is not assignable to type 'never'`, which was checked by doing it rather
than by reasoning about it. A boolean `isCollaborator` would have needed no such switch and would
have let the same change through unhandled.

**`404` from "both routes" is not available and the test says so.** The list route has no 404 to
give: a page simply does not contain the playlist. The two are asserted together, the single route
answering 404 with a body that names neither field, and the list route omitting the row, because
the property under test is that neither route reveals a playlist the account cannot see. The
assertion also checks the error body for the strings, since a 404 that mentioned `access` would
confirm the playlist exists.

**There is no query counter, so the N+1 is caught twice.** better-sqlite3 v13 has no `db.trace`, so
the seam is `sqlite.prepare`, patched on the instance for the duration of a test and restored
after. The primary test counts _all_ statements for a page of one and a page of six and asserts
they are equal, which needs no knowledge of the SQL and catches a per-row lookup for any field,
including one nobody has asked for yet. A second test pins the shape,
`select distinct "playlist_id" from "share" where ... in (...)`, once for the page, and says in its
name that it asserts the shape. Reinstating a per-row `exists` fails both, with 10 statements
against 5.

**Both fields are one value in production, as this ticket predicted.** No route writes a share, so
`access` is `owner` and `hasShares` is `false` everywhere until sharing lands. The end state is
exercised rather than theoretical because the tests seed the `share` table directly: all three
levels and both `hasShares` values are asserted against real rows, including an owner of an
unshared playlist reading the pair that is every playlist on the instance today. The two fields are
also asserted to be independent, which is the ticket's central claim: on one page a reader owns one
playlist and holds a share on another, so `access` differs between the two rows while `hasShares`
is true for one and false for the other. A field derived from the reader's own share would be true
for both, and one derived from `access` alone could not be false for a playlist the reader owns.

**The required-ness is tested, because a default would be worse than a missing key.** Giving both
fields a default and running the contract tests fails on the line that parses a playlist with
neither, which was checked by doing it. `hasShares: 'no'` is rejected too, since a client reading
a truthy string would be a bug the type is there to stop.

**One existing test name was corrected rather than left.** It read "reads the count from the
playlist row and joins nothing to produce it", which was true and no longer is, since the page
query now joins for the share level. It is now "does not count anything to produce it", which is
the property it was always asserting and is still true.

**The share routes are still `sendNotImplemented` and are still unowned.** `GET`, `POST` and
`DELETE /playlists/:id/shares` are untouched by this ticket, as its "Do not" required. Ticket 17
hosts the share dialog and will need the `GET`, and whoever picks that up has to answer who may
grant access, which is not answered here.

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Objective

`PlaylistSchema` carries no fact about the requesting account's relationship to the playlist, so no
client can tell the owner from a collaborator, a `write` collaborator from a `read` one, or an unshared
playlist from a shared one. Add the two facts the playlist header draws, and nothing else.

## Context

**The model is not missing. Only the contract is.** `docs/GLOSSARY.md` already fixes the vocabulary:
Owner, Share at level `read` or `write`, and Collaborator. All of it is built: the `share` table with
`playlistId`, `accountId`, `level` and a unique index, the `ShareLevel` enum, `ShareSchema`,
`SharePlaylistInputSchema`, and `visibleTo` in `apps/server/src/playlists/playlistService.ts`, which
already reads the share table to decide whether a playlist is visible. What no client can see is any of
it, because none of it reaches `PlaylistSchema`.

**Two fields rather than one enum, because the two facts are different kinds of thing.** The design
record grounds the header's three states in "two questions rather than one: who holds the keys, and
whether anybody else has been given one", and every pair of the three glyphs differs on exactly one of
them. `access` is a property of a (playlist, account) pair and changes with who is asking. `hasShares`
is a property of the playlist and does not. An enum that merged them into `owner_private`,
`owner_shared`, `write`, `read` would give one field two meanings depending on the requester, and the
glossary's own rule is that these are different axes: "an association links a track to a playlist; a
share links an account to a playlist."

**`access` has three values and no fourth.** There is no `none`, because a playlist the account cannot
see is `404`, which tickets 14 and 15 settled for the sync run and for both playlist routes. The
absence of a `none` is that decision restated on the wire, and adding one later would reopen it.

**The three values are not a refinement, they are three different menus.** The glossary gives a `write`
collaborator the right to add a track, remove a track and sync, and gives a `read` one none of those
three. Only sync lives in an overflow menu, so a `write` collaborator's carries Sync now and a `read`
collaborator's does not, and both differ from the owner's four items. A single `isCollaborator` boolean
would satisfy the header's glyph and fail the menu, which is why this is an enum and not a flag.

**The library route is not owner-scoped, and `access` is not a constant anywhere.** `visibleTo` returns
owned-or-shared, so `listPlaylistsForAccount` already returns playlists shared to the account as well
as playlists it owns. Ticket 15's Outcome calls that query "the account-scoped library query", which a
reader would reasonably take to mean owner-only, and it is not. So `access` varies row to row on the
library route and must be derived per row rather than hardcoded to `owner`, because a hardcoded `owner`
is a lie the day the two kinds of row are shown side by side.

**`toPlaylistView` is written field by field on purpose**, so the compiler fails the moment
`PlaylistSchema` gains a field. Adding these two makes that one function the only place the compiler
complains about, which is the intended behaviour rather than an obstacle.

**Both fields will be one value in production, and that is the state to record.** No route writes a
share: `GET`, `POST` and `DELETE /playlists/:id/shares` are all `sendNotImplemented` stubs. So `access`
is `owner` and `hasShares` is `false` on every row until the sharing feature lands, which means the
header's shared and collaborator states are still unreachable in the product even once this ticket is
done. The end state is exercised by seeding the share table directly in tests rather than by shipping a
writer, so the three states are proven without a second feature arriving in the same ticket.

**The share routes are unowned and this ticket does not take them.** Writing a share is a permission
change and needs its own disclosure and enforcement reasoning: who may grant access, what a revoked
share does to a cached client, and whether `GET /playlists/:id/shares` is owner-only. Ticket 17 hosts
the share dialog and will need that route, so the gap is real and named here rather than absorbed.

## Scope

- `packages/contracts/src/schemas.ts`: `access` on `PlaylistSchema`, holding `owner` plus the members of
  `ShareLevel`, and `hasShares`, a boolean. `access` is written as the union rather than as a fresh
  three-value list so that adding a level to `ShareLevel` without deciding what it means for access is a
  compile error instead of a silent omission. `hasShares` is not nullable, because "this playlist has no
  share" is an answer and not a missing value.
- `toPlaylistView` in `apps/server/src/playlists/playlistService.ts`: takes both facts as arguments.
  They are per-request and cannot be read off the playlist row, which is why the function's signature
  changes rather than only its body.
- `listPlaylistsForAccount`: one grouped query over the page's ids returning the ids that have at least
  one share, then a lookup per row. A per-row `exists` is a 50-query page on the route every client hits
  first.
- `readPlaylistForAccount`: the same two facts for one row, through the same translation.

## Do not

- Do not implement `POST /playlists/:id/shares`, `GET /playlists/:id/shares` or
  `DELETE /playlists/:id/shares/:accountId`. They are a separate ticket with a separate question about
  who may grant access.
- Do not add a share count, a collaborator array, or a `sharedWithMe` field. `hasShares` is a boolean
  because the header needs a yes or no, and a count would tell a `read` collaborator how many other
  accounts hold shares on a playlist they can only read. No screen asks for one.
- Do not make either field nullable or optional. A client handed `access: null` will guess, and the
  guess is the whole reason this ticket exists.
- Do not widen or narrow `visibleTo`. A playlist the account cannot see stays a 404, and no share field
  appears in an error body.
- Do not rename `ownerAccountId` or fold `access` into it. One is who created the playlist and the other
  is what the reader may do to it, and the glossary keeps Owner and Collaborator apart for that reason.
- Do not change the 404 disclosure on any route, including the share routes when they land.

## Blocking edges

Blocks `17-design-the-playlist-detail`, which draws rename, delete and share management as absent for a
collaborator and hosts the share dialog. Neither can be drawn against a contract that cannot say who is
asking, and a record that draws the rule without the field behind it is the fault this repo keeps writing
checks about.

## Verification

- A contract test that `access` accepts `owner`, `read` and `write`, and that a `ShareLevel` member
  added without a decision about `access` fails to compile.
- A route test that seeds a `share` row with raw SQL and proves all three `access` values and both
  `hasShares` values serialize on `GET /playlists/:id`, including an owner of an unshared playlist
  reading `access: owner` and `hasShares: false`. The seed is what makes the three states exercised
  rather than theoretical, since nothing writes shares yet.
- A test that the library returns both an owned playlist and one shared to the account, with different
  `access` on each, so the field cannot be quietly hardcoded.
- A test that `GET /playlists` issues one grouped share lookup for the page rather than one per row. If
  the harness cannot count queries, assert the shape of the SQL instead and say which in the test name.
- A test that a playlist the account neither owns nor holds a share on is `404` from both routes, and
  that its body carries no share field.
- `pnpm run build` and `pnpm run lint`.
