# Design the library screen

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Draw the library, the screen a user lands on. It is the list of playlists, it is the only entry point to
content, and it is where the player bar has nothing to play. It has a route on each client and is one
task, so one record carries both arrangements.

## Context

Settled in `13-settle-the-screen-inventory`: a screen is a surface a user reaches by route, and one
screen is one design task. The web route is `/` and the mobile route is the app root. The two
arrangements live in one record because the token layer is one value set consumed by both runtimes and
React Native cannot resolve `var()`, so the design system is already one system with two renderings.
Splitting a screen's design by client would contradict the thing the whole token layer exists to be.
The empty state record sets the pattern: one file, measured at 1014 and at 390.

**A record that carries two arrangements can be misread as one arrangement and a variant.** So the
record's first job is to name the two and keep them apart, and every measurement is attributed to a
width. That is a requirement here rather than a matter of taste, because the numbers differ and the
wrong one is not obviously wrong.

**The data is `GET /playlists`, scoped to the account, one page of `PageQuerySchema`'s default 50.**

**It is one list, not two sections.** A playlist shared to the account is in it, because the library is
the only entry point to content and a shared playlist has to be reachable. A shared item carries a
"shared by" line, which `ownerAccountId` and `GET /me` already supply. A second section would duplicate
the row and split an empty shelf into two meanings.

**Every row shows a count**, which is `trackCount` from `15`. That field's record says what it is not: a
total of associations, so a playlist of 300 with 290 still `pending` reads 300 and plays four songs.
Draw the row so that reading is not a promise, or record why it is one.

**The count reads 0 for every playlist until the first association writer lands.** `15` stores it in a
column on the playlist, and nothing in production writes associations yet: the sync, the manual add, the
remove and the orphan prune are all unimplemented stubs. So a row drawn from today's data is a row of
zeros, and the only honest way to design against that is to draw the row from a fixture with real
counts, not from the live shape. Worth knowing before the row is measured, because a count that is
always 0 is not a thing to lay out around.

**Three components this screen forces into existence, none designed.** The empty shelf: the playlist
empty state says in its own closing line that "the library with no playlists at all is a different
component with a different action", so it gets its own record and specimen rather than a variant of
the existing one. The player bar with nothing playing, which is the resting state of the screen a user
lands on and which the design record lists as not yet designed. And the add-a-playlist dialog, which is
hosted here and nowhere else.

**The mobile arrangement has one state the web arrangement cannot have.** Signed out, the app shows a
sign-in prompt, and it replaces the content area rather than sitting over it: no other resource in the
app is reachable, so there is no list behind it to dim. Web has no signed-out state at all and that is
not an omission, since Pangolin sits in front of nginx and an unauthenticated request never reaches the
SPA.

**No sidebar, no tab bar, no persistent chrome.** The page is a header and a list. The header's contents
are this ticket's to decide, and the obvious candidate is the add control, since creating a playlist is
a library action.

## Scope

- `docs/design/screens/library.html`: both arrangements, the empty shelf, and the bar at rest. A row in
  `docs/design/index.html` and a row in the map in `docs/DESIGN.md`.
- `docs/design-system/screens/library.md`, opening with the two arrangements named and kept apart, and
  attributing every measurement to a width.
- Three new component records with their specimens: the empty shelf, the player bar with nothing
  playing, and the add-a-playlist dialog.
- A row height per arrangement. A playlist row at the wide reference and the same row at 390 are two
  heights, not one height and a squeeze, and the record gives both.
- The mobile arrangement against the phone budget already in the records: a 136px header, a 98px bar,
  and 610px of content on an 844px phone, with the library's own row height subtracted from it.

## Do not

- Do not design the playlist detail. It is `17`.
- Do not add a sidebar, a top nav, a tab bar, a drawer, or anything persistent.
- Do not put a playable count or a "N ready" on a row. The count is a total and the field record says
  why.
- Do not design the queue panel. It belongs to the player bar record, and this screen is one of the
  places it can be opened from rather than a place it is designed.
- Do not redraw a shared component at a second width and call the result a variant. A component is
  specified once; a screen states which width it drew it at.
- Do not invent a route, a search field, a sort control or a filter. Search is a permanent non-goal and
  pagination is the API's, not a control this screen designs.

## Blocking edges

Blocked by `15-add-track-count-to-playlists`, since every row carries a count and a row with no field
behind it cannot be measured. That has landed, so the only thing standing between this ticket and
starting is itself.

## Verification

- `node docs/design/scripts/validate-design-tokens.cjs` passes. It needs no registration for the new
  files: `specimenFiles` walks `docs/design/` recursively, and the dead-link check reads
  `docs/design-system/` and the tracker recursively, so both new specimens and every new record are
  covered on arrival.
- Both arrangements are drawn, and the record attributes each measurement to a width. A reader who only
  reads the web half can tell it is half.
- Every state is drawn: the empty shelf, the populated list, the bar at rest, and the signed-out
  prompt on the mobile arrangement only. Each is listed in the map, and the shared three are specified
  once.
- Every text pairing in the new specimens has a measured ratio and clears AA, computed rather than
  judged, as in every other subject in the record.
- `pnpm run build` and `pnpm run lint`.
