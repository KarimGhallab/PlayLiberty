# Design System: PlayLiberty

## Overview

A calm, dark-only, content-forward music library. It should read as a dependable personal shelf, not a
video feed and not a gamer dashboard.

Every value in this system is measured and decided. The specimens in `docs/design/` draw them; this
directory is the record of what was decided and why, and the two are not the same job.

The values live in [`docs/design/tokens.css`](design/tokens.css) and nowhere else. That file is the
contract that `10-build-design-foundation` transcribes into `packages/tokens`, so these documents and the
specimens describe the design while `tokens.css` defines it. Where the two disagree, `tokens.css` is
right and a document here is stale.

Every ratio quoted anywhere in this directory is recomputed from the token values on every run of
`docs/design/scripts/validate-design-tokens.cjs`, so a number that has gone stale fails the build rather
than misleading a reader.

## The map

| Subject                      | File                                                                   | Specimen                                                  |
| ---------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Colour, contrast, tones      | [colour](design-system/colour.md)                                      | [color](design/foundations/color.html)                    |
| Typography                   | [typography](design-system/typography.md)                              | [type](design/foundations/type.html)                      |
| Space, shape, depth          | [space and shape](design-system/space-and-shape.md)                    | [space](design/foundations/space-shape-motion.html)       |
| Icons and the morph          | [icons](design-system/icons.md)                                        | [icons](design/foundations/icons.html)                    |
| Motion                       | [motion](design-system/motion.md)                                      | [space](design/foundations/space-shape-motion.html)       |
| Focus ring, stacking, layout | [focus and layout](design-system/focus-and-layout.md)                  | [space](design/foundations/space-shape-motion.html)       |
| Equalizer strip              | [equalizer strip](design-system/components/equalizer-strip.md)         | [specimen.css](design/specimen.css)                       |
| Header transport             | [header transport](design-system/components/header-transport.md)       | [playlist header](design/components/playlist-header.html) |
| Player bar                   | [player bar](design-system/components/player-bar.md)                   | [player bar](design/components/player-bar.html)           |
| Empty state                  | [empty state](design-system/components/empty-state.md)                 | [empty state](design/components/empty-state.html)         |
| Sync summary                 | [sync summary](design-system/components/sync-summary.md)               | [sync summary](design/components/sync-summary.html)       |
| Sync error                   | [sync error](design-system/components/sync-error.md)                   | [sync error](design/components/sync-error.html)           |
| Track row play control       | [row play control](design-system/components/track-row-play-control.md) | [track row](design/components/track-row.html)             |
| Form controls                | [form controls](design-system/components/form-controls.md)             | [form controls](design/components/form-controls.html)     |

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
- **Playlist header**, the playlist's identity: cover, name, sync status, last synced. Its decisions are
  split between [the equalizer strip](design-system/components/equalizer-strip.md), which covers the
  artwork, and [the transport on the playing header](design-system/components/header-transport.md),
  which covers the controls.
- **Sync summary**, the outcome of the last run. A different record with a different lifetime from the
  playlist, which is why it is a component of its own, and it gives `retainedCount` a deliberate position
  rather than one item in a list of counts. Specified in
  [the sync summary](design-system/components/sync-summary.md).
- **Sync error**, because `PlaylistSyncStatus.Error` and a non-null `SyncRun.error` are both reachable. A
  failed sync is exactly when the user needs to know, and exactly where "do not nag" could tempt a
  designer into silence. Specified in [the sync error](design-system/components/sync-error.md).

## What is not yet designed

The library-with-no-playlists state, which is a different component from the playlist empty state and
has a different action. And the player bar with nothing playing. Both are designed in
[`16-design-the-library`](tracker/tasks/16-design-the-library.md), because the library is the
route a user lands on, so both are states of it rather than corners of it.

**The screens are settled; none is drawn.** The inventory is
[`13-settle-the-screen-inventory`](tracker/tasks/13-settle-the-screen-inventory.md), and a screen is a
surface a user reaches by route, so there are two screens and two design tasks rather than four: the
library in `16` and the playlist detail in `17`, each with a route on each client and one record
carrying both arrangements. There is no web sidebar, no mobile tab bar, and no account surface on
either client. A screen record lives in `docs/design-system/screens/` and its specimen in
`docs/design/screens/`, and the map above gains a row per screen as each one lands. A record with two
arrangements names them and attributes every measurement to a width, so neither reads as a variant of
the other.

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

Edit `docs/design/tokens.css`, then run:

```
node docs/design/scripts/validate-design-tokens.cjs
```

It runs 22 checks. `tokens.css` holds nothing but custom property declarations. No specimen hard-codes a
colour a token already carries. No `:hover` rule paints with a tone token, which is the one mistake in
this file that no ratio can catch and so has to be forbidden outright. Every text pairing clears AA at
4.5:1. Every control boundary clears 3:1. Every ratio printed on a specimen still matches. Nothing
references a token that no longer exists. Every ratio quoted in this directory still matches. Every mapped
state word is drawn as a state label, which is an element carrying a state class rather than the word
appearing anywhere in a file. Every relative link resolves to a file that exists, across the specimens,
this directory and the tracker, which is why the index marks what is unbuilt as text rather than
linking it. The tracker is in that walk because a ticket and a design record point at each other with
paths relative to where each sits, and a path one `..` short breaks without looking wrong.

It also holds the rejected candidates at their measured values. Those cannot fail the run, because they
are values that were tried and ruled out, and their only job is to hold a figure steady so a document can
honestly say what the alternatives were. The known-bad pairings are declared with a `FORBIDDEN` prefix and
are measured but do not fail the run, so the value the system ruled out stays recorded instead of quietly
becoming legal again. While task `09` is open the stylesheet is authoritative. Once
`10-build-design-foundation` lands, `packages/tokens` is authoritative, the emitter writes the stylesheet
the web client loads, and the specimens become a dated snapshot of what was decided.

The specimens themselves are in `docs/design/`, one file per subject, and they are not the
implementation. The component specimens contain flexbox that the real React and React Native components
will not share, because the two runtimes lay out differently. The specimens illustrate; this directory
specifies.
