# Design the playlist detail screen

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Draw the playlist detail, the screen the whole product exists for: the only place stored tracks become
audible. It has a route on each client and is one task, so one record carries both arrangements. It
composes components that are already designed, and its work is to arrange them, host two dialogs, and
cover the states a playlist can be in.

## Context

Settled in `13-settle-the-screen-inventory`: a screen is a surface a user reaches by route, and one
screen is one design task. The web route is `/playlists/:id` and the mobile route is pushed over the
library root. Both arrangements live in one record because the token layer is one value set consumed by
both runtimes and React Native cannot resolve `var()`, so the design system is one system with two
renderings. The empty state record sets the pattern: one file, measured at 1014 and at 390.

**A record that carries two arrangements can be misread as one arrangement and a variant.** So the
record names the two and keeps them apart, and every measurement is attributed to a width. Three facts
below are true of one client and not the other, and a merged record is exactly where they get lost, so
each is called out where it belongs rather than left to be inferred.

**Three of the four states already have designed components and one does not.** Never synced is the
empty state, which is `lastSyncedAt` null. Syncing is the header's busy form plus the sync summary's
in-flight figure. Error is the sync error, and that record already refuses to be reached from the empty
state, since a failed first sync is a fault rather than an absence. Not found has no component: a
playlist that does not exist, or that was shared to this account and is not any more, answers 404, and
the empty state cannot stand in for it because the empty state's words say that nothing is here because
the playlist has never synced, which would be a lie. So a fourth state is designed here.

**Two dialogs are hosted here and nowhere else, on both arrangements.** Sharing, and adding a video.
The second is on the detail only, with the current playlist preselected and any other writable playlist
selectable, which is what makes its label mean the same thing everywhere it appears; there is no
version of it without a preselection, which is why the library does not host it. It fires one
`POST /playlists/:id/tracks` per chosen playlist, since no multi-playlist route exists.

**Three controls are permission-gated, and absent rather than disabled.** A `write` collaborator may add
a track, remove a track and sync. Rename, delete and share management stay with the owner. The rule is
one sentence so it can be checked against this screen in one pass, and a visible control that cannot be
pressed is the fault the validator already checks for in the track row.

**The way home is a web fact only.** On mobile the platform gesture returns from a pushed route, so the
mobile arrangement has no way-home control to place. Web has no gesture, so the web arrangement carries
the affordance back to `/`, and the library needs none. Draw it, measure what it costs the header, and
say in the record that its absence on mobile is the gesture rather than an omission.

**The header record cannot be assumed to hold at 390, and the reason is a gap in the record.**
`docs/design-system/components/header-transport.md` measures absolute pixels: three equal 48px transport
steps cost 160px of the actions column, one row of five costs 208px, and the title column ends up at
750px, 670px or 718px depending. It never states the width it measured those at. Its sibling, the empty
state record, names both 1014 and 390 explicitly, so the omission is the header's alone. So the mobile
arrangement cannot be assumed from the web one, and the phone header has to be measured from nothing.
Measuring both in one record is what closes that gap: state the width the header's own numbers came
from, beside the phone measurement, so the next reader does not have to guess it again.

**The height budget is measured, and the two arrangements are measured differently.** The sync summary
is 66px at rest and 91px while a run is active, and a track row is 65px. The mobile arrangement has
610px of content area on an 844px phone between a 136px header and a 98px bar, so 8 rows and a resting
summary is 586 of 610 and the in-flight summary drops it to 7. On web the width is not the constraint
and the height is, so state the viewport height the web arrangement is drawn at and what it fits,
rather than carrying the phone's number across. A fourth state, not found, has no height to give in
either.

## Scope

- `docs/design/screens/playlist-detail.html`: both arrangements. A row in `docs/design/index.html` and a
  row in the map in `docs/DESIGN.md`.
- `docs/design-system/screens/playlist-detail.md`, opening with the two arrangements named and kept
  apart, and attributing every measurement to a width.
- A new component record and specimen for the not-found state.
- The share dialog record, and the add-a-video dialog record including its checklist over writable
  playlists and the fact that it issues one request per chosen playlist, drawn on both arrangements
  since a dialog is narrower on one than the other.
- The header measured at both widths, with the web arrangement's way-home affordance and the mobile
  arrangement's lack of one.

## Do not

- Do not redesign the header, the track row, the sync summary or the sync error. They are specified
  and this screen composes them. If one cannot be composed here, that is a finding to record in the
  screen's record rather than a change to make here.
- Do not treat the mobile arrangement as the web one squeezed. Three 48px steps, a cover, a name, a
  count and a dialog trigger do not fit at 390, and the point of measuring is to find out what gives.
- Do not make the summary's in-flight figure a server fact. There is no stored pending count in the
  contract and the figure is derived from the tracks the client holds, which the record says out loud.
- Do not show rename, delete or share management to a collaborator. Absent, not disabled.
- Do not draw a queue. It is a panel on the player bar record, and it can be opened from here on either
  arrangement.
- Do not add a way-home control to the mobile arrangement, and do not add a tab bar to make the mobile
  header shorter.

## Blocking edges

Nothing blocks this ticket. It was blocked by `14-expose-the-last-sync-run`, which the sync summary
and the sync error both bind to, and by `18-expose-playlist-access`, which added `access` and
`hasShares` to `PlaylistSchema` so that "absent for a collaborator" has a field behind it rather than
only a rule. Both have landed.

The two access values are worth reading before the permission-gated controls above are drawn.
`access` is `owner`, `write` or `read`, and it is the level that decides the overflow menu, so the
three menus this screen has to draw are the owner's four items, a write collaborator's two, and a
read collaborator's one. `hasShares` is a separate boolean about the playlist rather than the reader,
and a record that treats the two as one fact will draw the wrong menu for somebody.

## Verification

- `node docs/design/scripts/validate-design-tokens.cjs` passes, with no registration needed for the new
  files.
- Both arrangements are drawn, and every measurement is attributed to a width.
- All four states are drawn: never synced, syncing, error, not found. The first three use their existing
  components unchanged, and the record says so rather than redrawing them differently.
- The record states which of its facts are web-only and which are mobile-only: the way home, the absent
  back control, the signed-out library is not this screen, and the phone height budget.
- The three owner-only controls are absent for a collaborator, and the record names which three they
  are.
- The header is measured at both widths, and the record gives the width the existing header record's
  numbers were taken at, which is the gap this ticket had to work around.
- Every new text pairing has a computed ratio clearing AA.
- `pnpm run build` and `pnpm run lint`.
