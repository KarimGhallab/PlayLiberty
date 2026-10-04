# Design System: PlayLiberty

## Overview

A calm, dark-only, content-forward music library. It should read as a dependable personal gallery, not a
video feed and not a gamer dashboard.

Every value in this system is measured and decided. The specimens in `docs/design/` draw them; this
directory is the record of what was decided and why, and the two are not the same job.

The values live in `packages/tokens/src/values.ts` and nowhere else, and the emitter there writes the
stylesheet the web client loads. `docs/design/tokens.css` is the dated snapshot that
`10-build-design-foundation` transcribed from, so these documents and the specimens describe the design
while the snapshot records what was decided on the day it was taken. Where the two disagree, the package
is right and the snapshot is the decision it was taken from.

Every ratio quoted anywhere in this directory is recomputed from the token values on every run of
`docs/design/scripts/validate-design-tokens.cjs`, so a number that has gone stale fails the build rather
than misleading a reader.

## The map

| Subject                      | File                                                                   | Specimen                                                     |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Colour, contrast, tones      | [colour](design-system/colour.md)                                      | [color](design/foundations/color.html)                       |
| Typography                   | [typography](design-system/typography.md)                              | [type](design/foundations/type.html)                         |
| Space, shape, depth          | [space and shape](design-system/space-and-shape.md)                    | [space](design/foundations/space-shape-motion.html)          |
| Icons and the morph          | [icons](design-system/icons.md)                                        | [icons](design/foundations/icons.html)                       |
| Motion                       | [motion](design-system/motion.md)                                      | [space](design/foundations/space-shape-motion.html)          |
| Focus ring, stacking, layout | [focus and layout](design-system/focus-and-layout.md)                  | [space](design/foundations/space-shape-motion.html)          |
| Equalizer strip              | [equalizer strip](design-system/components/equalizer-strip.md)         | [specimen.css](design/specimen.css)                          |
| Header transport             | [header transport](design-system/components/header-transport.md)       | [playlist header](design/components/playlist-header.html)    |
| Player bar                   | [player bar](design-system/components/player-bar.md)                   | [player bar](design/components/player-bar.html)              |
| Empty state                  | [empty state](design-system/components/empty-state.md)                 | [empty state](design/components/empty-state.html)            |
| Sync summary                 | [sync summary](design-system/components/sync-summary.md)               | [sync summary](design/components/sync-summary.html)          |
| Sync error                   | [sync error](design-system/components/sync-error.md)                   | [sync error](design/components/sync-error.html)              |
| Track row play control       | [row play control](design-system/components/track-row-play-control.md) | [track row](design/components/track-row.html)                |
| Form controls                | [form controls](design-system/components/form-controls.md)             | [form controls](design/components/form-controls.html)        |
| Playlist header              | [playlist header](design-system/components/playlist-header.md)         | [playlist header](design/components/playlist-header.html)    |
| Add a playlist               | [add a playlist](design-system/components/add-playlist-dialog.md)      | [add a playlist](design/components/add-playlist-dialog.html) |
| Empty gallery                | [empty gallery](design-system/components/empty-gallery.md)             | [library](design/screens/library.html)                       |
| Library                      | [library](design-system/screens/library.md)                            | [library](design/screens/library.html)                       |
| Playlist detail              | [playlist detail](design-system/screens/playlist-detail.md)            | [playlist detail](design/screens/playlist-detail.html)       |

The two directory splits are the same split. `docs/design/` holds what you look at, and
`docs/design-system/` holds why it is that way.

## The component inventory

These are the components, not their specs. Each links to the file that specifies it.

- **Track row**, the core unit that appears in every list. It expresses a state space of two independent
  axes: `TrackFileStatus` carries pending, downloading, stored, failed and unavailable, and
  `TrackSourceStatus` carries available and removed, so five by two. It also absorbs three cases the
  schemas permit and a state list would miss: `thumbnailPath` is nullable, `durationSeconds` is nullable,
  and `failureReason` is a non-null string with no length bound. Its play control is specified in
  [the row's play control](design-system/components/track-row-play-control.md).
- **Player bar**, persistent across the app. Specified in
  [the player bar](design-system/components/player-bar.md).
- **Empty state**, shown before the first sync, which is also the state where `lastSyncedAt` is still
  null. Specified in [the empty state](design-system/components/empty-state.md).
- **Playlist header**, the playlist's identity: cover, name, share, count, sync line and actions. Specified
  in [the playlist header](design-system/components/playlist-header.md), which owns it at both of its
  arrangements and exists because there are two consumers: the header itself, and
  [the library](design-system/screens/library.md), whose playlist items are this component rather than a
  smaller thing that resembles it. Its rules live in `specimen.css` for the same reason, and a decision
  that exists only as a comment in one stylesheet cannot be inherited by a second consumer. Its parts are
  split further: the strip is [the equalizer strip](design-system/components/equalizer-strip.md), the
  steps are [the transport on the playing header](design-system/components/header-transport.md), and the
  state words are [the sync summary](design-system/components/sync-summary.md).
- **Sync summary**, the outcome of the last run. A different record with a different lifetime from the
  playlist, which is why it is a component of its own, and it gives `retainedCount` a deliberate position
  rather than one item in a list of counts. Specified in
  [the sync summary](design-system/components/sync-summary.md).
- **Sync error**, because `PlaylistSyncStatus.Error` and a non-null `SyncRun.error` are both reachable. A
  failed sync is exactly when the user needs to know, and exactly where "do not nag" could tempt a
  designer into silence. Specified in [the sync error](design-system/components/sync-error.md).
- **Empty gallery**, the library with no playlists at all, which is a different component from the
  playlist empty state and has a different action. Specified in
  [the empty gallery](design-system/components/empty-gallery.md).
- **Add a playlist**, the dialog the library hosts on both clients, in two arrangements because a sheet
  is the phone's own idiom for a short task. Specified in
  [add a playlist](design-system/components/add-playlist-dialog.md).

## What is not yet designed

**The playlist detail's own components: the share dialog and the add-a-video
dialog.** The screen is drawn, on web so far, and those two are the pieces of it that do not exist
yet; the not-found state is now built as `PlaylistNotFound`. The inventory is
[`13-settle-the-screen-inventory`](tracker/tasks/13-settle-the-screen-inventory.md), and a screen is a
surface a user reaches by route, so there are two screens and two design tasks rather than four: the
library, drawn in [`16-design-the-library`](tracker/tasks/16-design-the-library.md), and the playlist
detail in [`17-design-the-playlist-detail`](tracker/tasks/17-design-the-playlist-detail.md). There is
no web sidebar, no mobile tab bar, and no account surface on either client.

## The screens

A screen record lives in `docs/design-system/screens/` and its specimen in `docs/design/screens/`. A
record carries both arrangements and attributes every measurement to a width, so neither reads as a
variant of the other, and the first thing it does is name the two.

- **Library**, at `/` on web and the app root on mobile. The only entry point to content, so it is
  the route a user lands on. Specified in [the library](design-system/screens/library.md). Drawing it
  forced three things into being that were not designed: the empty gallery, the add-a-playlist dialog,
  and an answer to what the player bar does before anything is playing. That last one withdrew a
  claim the [player bar record](design-system/components/player-bar.md) had made, and the correction
  is written into that record rather than left here as an exception.
- **Playlist detail**, at `/playlists/:id` on web and pushed over the library root on mobile. The only
  place stored tracks become audible. Specified in
  [the playlist detail](design-system/screens/playlist-detail.md), both arrangements drawn: eight desk
  frames at 1056 by 900 and seven phone frames at 390 by 844. Composing it found three faults in
  components it did not draw, and two of them are the same mistake seen from two angles: **every track
  row in the tree was 120.8px rather than 65px**, and **every state word in every track row carried a
  7px mark it never asked for**, both because two of the playlist header's rules in the shared
  stylesheet were landing on the track row's elements of the same name. The third is that **five of the
  row's class names are also `specimen.css`'s**, so the row's rules have to be scoped to be drawn beside
  the header at all. All three are written up there, and the third is still open: the durable fix is a
  change to the track row and belongs to a ticket about it.
- **A lifted component fragment is not a component.** The detail lifted the player bar out of its record
  and got a 390 flush bar in a 1056 frame: transport 443.2px off centre, no shuffle at all, and a seeker
  running 956px where that record's argument is a 480px cap. A lift now takes the component's primary
  arrangement and a consumer adds the variant class if it wants the other, asserted in the generator, so
  the mistake fails the build instead of rendering. The same inversion let the phone take the flush bar
  it actually wants.

## Do's and Don'ts

- Don't put a state in colour alone. Every state carries a word, and the word is what a reader without the
  colour reads.
- Don't spend a tone on a fact that did not change. A colour used for a standing total is a colour the eye
  stops trusting on an event.
- Don't give an icon a colour. It takes the colour of the control it sits in, so no glyph is ever the most
  saturated thing on screen.
- Don't draw a glyph by hand when the set has one, and don't reach for a second weight to work around a
  size that was never measured.

## Changing a value

Change the value in `packages/tokens/src/values.ts` and rebuild with `pnpm run tokens:build`. The
snapshot is not edited; the check below is run when a document here or a specimen changes:

```
node docs/design/scripts/validate-design-tokens.cjs
```

The checks and the reason for each are owned by the script's own header comment. Their subjects, briefly:
`tokens.css` holds nothing but custom-property declarations; no specimen hard-codes a colour a token already
carries; no `:hover` rule paints with a tone token; a text pairing clears AA at 4.5:1 and a control boundary
clears 3:1, both computed rather than asserted; every ratio printed on a specimen or quoted in this
directory still matches; nothing references a token that no longer exists; every mapped state word is drawn
as a state label; and every relative link resolves across the specimens, this directory and the tracker,
which is why the index marks what is unbuilt as text rather than linking it.

It also holds the rejected candidates at their measured values. Those cannot fail the run, because they
are values that were tried and ruled out, and their only job is to hold a figure steady so a document can
honestly say what the alternatives were. The known-bad pairings are declared with a `FORBIDDEN` prefix and
are measured but do not fail the run, so the value the system ruled out stays recorded instead of quietly
becoming legal again. `packages/tokens` is authoritative now that `10-build-design-foundation` has landed, the emitter writes
the stylesheet the web client loads, and the specimens and `tokens.css` are the dated snapshot of what
was decided.

The specimens themselves are in `docs/design/`, one file per subject, and they are not the
implementation. The component specimens contain flexbox that the real React and React Native components
will not share, because the two runtimes lay out differently. The specimens illustrate; this directory
specifies.
