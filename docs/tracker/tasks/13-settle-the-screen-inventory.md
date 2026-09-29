# Settle the screen inventory

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

Four screens, two per client, and the definition that produced the count. The reasoning is recorded
because two of these decisions reverse what the repository said before, and a reader who finds the
reversal needs to find the reason in the same file.

**A screen is a surface a user reaches by route, and one screen is one design task.** A screen has a
route on each client, so it has two arrangements and one record. The two clients are separate codebases
and the scaffold tickets create both routes, but the design of a screen is one piece of work, because
the token layer is one value set consumed by both runtimes and React Native cannot resolve `var()`. The
design system is already one system with two renderings, and splitting a screen's design by client
would contradict the thing the token layer exists to be. The empty state record sets the pattern: one
file, measured at 1014 and at 390.

A record carrying two arrangements can be misread as one arrangement and a variant, so each screen
record names the two and keeps them apart, and every measurement is attributed to a width. That is
carried into both tickets as a verification item rather than left to taste.

**There is no fixed sidebar, and no bottom bar on mobile.** The web shell has no persistent chrome, so
the library is a route like any other and there is no shell task to carve out as an exception to the
definition. On mobile the library is the root route and the detail is pushed, with the platform gesture
as the way back. A bottom tab bar was rejected on arithmetic rather than taste: the content area on a
phone is 610px between a 136px header and a 98px bar, the sync summary at rest is 66px, and 8 rows of
a 65px track list with it is 586 of that 610, leaving 24px of slack. A 56px tab bar turns 8 rows into
7, for a bar that would have had two tabs.

**The library is one list, not two sections.** A playlist shared to the current account has to be
reachable and the library is the only entry point to content, so shared playlists are in it either way.
A shared item carries a "shared by" line, which `PlaylistSchema.ownerAccountId` and `GET /me` already
supply. A second section would duplicate the item and split an empty shelf into two different
meanings.

**A `write` share permits adding a track, removing a track, and syncing. It does not permit renaming,
deleting, or managing shares.** Rename and delete stay with the owner. The rule is one sentence so it
survives being read once, and it means the detail screen hides exactly three controls for a collaborator
rather than consulting a permission matrix per control.

**Reordering the queue is client-local and never touches the database.** It is re-applied over every
refetch, because ticket `05` already persists the queue in `localStorage` and an order that survives a
reload but not a refetch is not a behaviour. Known video ids keep the user's sequence, ids new to the
client append in the server's order, so a track arriving from a sync appears at the end of the
arrangement rather than reshuffling it. No reorder route exists and none is wanted.

### The jobs

1. **Bring in a playlist and keep it.** Paste a playlist URL, sync it, and still have every track later
   even after YouTube removes videos.
2. **Play something.**
3. **Put one more song into playlists I already have.**
4. **Get music from someone on the instance,** in both directions: share a playlist out, open a
   playlist shared in.

"Know what happened" is not a fifth job. A failed sync and a track that would not download are states
the detail already surfaces, through the sync error and the failed track row, and a dedicated
what-happened screen is a place to put things nobody asked to see, which the brand commitments rule
out. Admin is a role, not a surface: v1 has no admin screen.

### The inventory

Two screens, four routes, two design tasks.

| Design task                                                         | Web route        | Mobile route         | Jobs    | States it must draw                                 | Dialogs it hosts   |
| ------------------------------------------------------------------- | ---------------- | -------------------- | ------- | --------------------------------------------------- | ------------------ |
| [`16-design-the-library`](16-design-the-library.md)                 | `/`              | root                 | 1, 4    | empty, populated, bar at rest; signed out on mobile | add a playlist     |
| [`17-design-the-playlist-detail`](17-design-the-playlist-detail.md) | `/playlists/:id` | pushed over the root | 2, 3, 4 | never synced, syncing, error, not found             | share, add a video |

Three facts belong to one client rather than the screen, so they are recorded here and carried into
`17` rather than left to be inferred from a merged record. The web detail owns the way home, because on
web there is no platform back gesture and the mobile arrangement has one. The mobile library's
signed-out state replaces the content area rather than sitting over it: signed out, no other resource
in the app is reachable, so a banner over an empty list would be the wrong shape. And the 610px height
budget belongs to the phone only, since on web the width is not the constraint and the height is.

### What rides along rather than being a screen

- **Add a playlist** is a dialog on the library, both clients. A playlist is created at the level where
  playlists are the unit, and the library's empty state already names it as its action with an action
  distinct from the playlist empty state's.
- **Add a video** is a dialog on the detail only, both clients, with the current playlist preselected
  and any other writable playlist selectable. It fires one `POST /playlists/:id/tracks` per chosen
  playlist, since no multi-playlist route exists. It is not on the library because the preselection is
  what makes the affordance's label mean the same thing in both places.
- **Share** is a dialog on the detail, both clients.
- **The queue** is a right-hand panel on web and a sheet above the bar on mobile, specified in the
  player bar record rather than in a task of its own. It is an overlay and not a route, because a URL
  for it means leaving what you are listening to in order to ask about it. It is also not the sidebar
  that was withdrawn: it exists only while it is open.
- **Sign-in** is a full-screen state of the mobile library route. A route only reachable from a state
  of another route is a route that exists to be a state.

### Rejected, with the reason

- **An account surface, on either client.** Web never has a signed-out state: Pangolin sits in front of
  nginx, so an unauthenticated request never reaches the SPA and the app is only ever loaded
  authenticated. There is nothing to draw. Mobile's is a state of the library route.
- **Settings or preferences.** No field for one exists anywhere in the contracts, and the switch in
  the form-controls record is a generic specimen with nothing behind it. No preference, therefore no
  screen.
- **A queue route.** Covered above.
- **The add-a-video dialog on the library.** Covered above.
- **An admin surface.** A role, not a surface.
- **A global view of stored content.** A permanent non-goal, unchanged by any of this.
- **Offline.** Out of scope in v1 by the glossary, and it would be the only screen with no server
  dependency at all.

### The server work this depends on

- **`14-expose-the-last-sync-run`** blocks both detail tasks. No route returns `SyncRunSchema`, so the
  sync summary and the sync error have no data source at all, and the schema is already written, so
  this is a query and a payload decision rather than new modelling.
- **`15-add-track-count`** blocks both library tasks. `PlaylistSchema` has no count, and the library
  cannot derive one without fetching every playlist's tracks. The field is the number of associations
  on the playlist and it is not a promise of playability: a playlist of 300 tracks with 290 still
  `pending` shows 300. It does not touch the sync summary's in-flight downloading figure, which is a
  client-side derivation and stays one.

The two client tickets are corrected in the same change, because each named screens this ticket has
now settled: `05` named an account screen, `06` named an account screen and a settings screen, and
both build a queue that has no surface.

### Two verification items in this ticket no longer describe what was decided

The list required the inventory to be a list in `docs/PRODUCT.md` or `docs/ARCHITECTURE.md`, and
required each entry to state whether it is one screen on two clients or two. The first is superseded:
the inventory is the task series, `TASKS_TRACKER.md` is its index, and the job set lives in this
outcome. The second is dissolved, and it is the one that moved twice: a screen has a route on each
client, and it is one design task carrying both arrangements, so the question has one answer for every
entry. Both lines are rewritten below rather than deleted, so the change is visible.

### Surfaced here, and not settled here

**A stream error has no designed state.** `GET /tracks/:id/stream` can fail, and the player bar
records "with nothing playing" as undesigned but say nothing about a stream that failed mid-playback.
A queue surface makes a failed item more likely to be noticed, so the gap is worth naming now. It
belongs to the player bar record rather than to a screen task, because the bar is what reports it.

## Objective

Decide which screens the product actually has, and write the list down somewhere a client ticket can
read it. This is a decision ticket, not a drawing ticket: it produces an inventory and the argument
behind each entry, and no HTML.

It exists because the inventory was previously assumed rather than decided. Ticket `09` named two
screens, the playlist detail on web and the playlist detail on mobile, and drew neither. That pair came
from the component list rather than from anything a user does, and a screen list derived from the
components is a list of what can be assembled rather than of what someone needs.

## Context

Read `docs/PRODUCT.md` first, particularly its commitment that there is no global library view and that
playlists are the only entry point to content, which removes one screen that would otherwise be
assumed. Then read `docs/GLOSSARY.md`, `docs/ARCHITECTURE.md`, and `packages/contracts/src/schemas.ts`
and `enums.ts`, which fix the records a screen has to render. Then read the component records in
`docs/design-system/components/`, because a screen is a composition of those and an inventory that
cannot be composed from them is a screen nobody can build.

The two shells a screen has to fit were meant to come from ADR 0005 and ADR 0007, and they do not:
both are stack decisions and neither mentions a shell. The owner is
[`docs/design-system/focus-and-layout.md`](../../design-system/focus-and-layout.md), which promised a fixed
sidebar plus content on web, a single column on mobile, and a persistent player bar on both. The Outcome
above withdraws the sidebar, so only the single column and the bar survive.

## Scope

This is a grilling session, not a research task. The work is to argue the inventory against someone who
has to live with it, which means the questions below are asked rather than answered.

- What a user is trying to do, stated as jobs rather than as pages. Every screen has to trace back to
  one, and a screen that traces to none is a screen that exists because a component was available.
- The screens that follow, and the screens that were rejected with the reason. A rejected screen with a
  recorded reason is worth more than a settled one without, because the next person to want it will
  otherwise re-open it.
- Which screens are one screen on two clients and which are genuinely two. The playlist detail is
  probably one job and two layouts, and a list that calls them one entry hides that.
- What a screen does when the thing it is about does not exist yet, and when it failed. The empty state
  and the sync error are decided; a screen still has to say which of them it can reach.
- What leaves a screen. A screen that is a dead end is a decision, and it is better made now than
  discovered by a user.

Out of scope: drawing any of them, and the visual design of any of them. `09` drew the components and
this ticket names the screens those components compose into. Each screen, once named, becomes its own
ticket when it is worth drawing.

## The candidate inventory to argue with

Offered as a starting position, not as an answer. Each is here because a component exists for it, which
is exactly the reasoning this ticket exists to distrust.

- The playlist detail, which is the only entry point to content and therefore cannot be optional.
- The library, which is the list of playlists. Complicated by the standing decision that there is no
  global library view, so this is a list a user reaches rather than a view they always sit in.
- The share dialog, for handing a playlist to another account. `ShareLevel` and the dialog exist.
- The settings or preferences, for the switch that applies immediately and the account fields. Its
  necessity is unproven and that is worth arguing.
- Adding a playlist, whether a dialog or a route, and the same for adding a single video.
- An account or sign-in surface, which may be entirely the Pangolin edge's job and therefore not ours.

## Out of scope

Application code, any HTML, and any screen that this session concludes the product does not need.

## Blocking edges

None. It could start immediately, and the four tickets it implies are created by it rather than waiting
on it: two server tickets that have no predecessor, and two design tasks blocked on one server ticket
each.

## Verification

- The inventory is the task series, indexed by `TASKS_TRACKER.md`, and a client ticket can read it
  without opening this ticket. This line used to require a list in `docs/PRODUCT.md` or
  `docs/ARCHITECTURE.md`; the inventory is four task files and two server tickets, so a list in either
  document would have been a second copy of the same names able to disagree with the tasks. Each task
  names the job it serves.
- Every screen not on the list has a recorded reason for its absence, so re-opening it is a deliberate
  act rather than an accident of having forgotten.
- Each entry states whether it is one screen on two clients or two screens, since that decides whether
  it is one ticket or two. This line is kept because it is the question the definition answers, and it
  is the one that moved twice: a screen has a route on each client and is one design task carrying both
  arrangements, so the answer is one ticket for every entry, and what a merged record owes its reader
  is that the two arrangements are named and every measurement is attributed to a width.
- This ticket records the outcome and is then resolved. The drawing tickets it implies are created after
  it lands, one per screen, so that no ticket is a layer of a larger change.
