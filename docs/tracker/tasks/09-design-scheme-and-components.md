# Design the color scheme and components

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Objective

Decide the app's visual system and every token value that follows from it, as hand-written HTML specimens under `docs/design/`, then bring the design record in line with what was decided. This ticket owns the mood, the palette, the type scale, the spacing, the shape, the motion, and the components named in the record. It writes no application code.

## Outcome

The visual system is decided and drawn. `docs/design/tokens.css` holds 63 values as a flat set of custom
properties with no `var()` alias, and twelve specimens under `docs/design/` link it rather than
restating a value. The decision record is `docs/DESIGN.md` for the index and the cross-cutting rules,
and `docs/design-system/` for one file per subject.

**Seven component specimens shipped**: the track row, the player bar, the empty state, the playlist
header, the sync summary, the sync error and the equalizer strip, plus the foundations for colour, type,
space, shape, motion and icons. The sync error and the sync summary were not in the original inventory;
both were added because `PlaylistSyncStatus.Error` and a non-null `SyncRun.error` are reachable, and a
failed sync is exactly where "do not nag" could tempt a designer into silence. Shipping the error removed
the fault sentence from the playlist header, so the split is three ways and is stated from all three
ends: the header owns the state and the time, the summary owns the counts, the error owns the words and
the action.

**The validator grew from six checks to 22**, and several exist only because a sentence in a document was
not enough. A typed glyph is now check `2g`, a button that centres an icon without declaring its padding
is `2h`, a transition naming a line height instead of a curve is `2k`, a hand-edited morph frame is `2j`,
a state word that is not drawn as a state label is `2e`, and a relative link to nothing is caught across
the whole record rather than in the specimens alone. One check was withdrawn rather than left passing: a
scrim check had nothing to fire on, and a check that cannot fire reports a safety that is not there. The
reserved rule lives beside the strip instead.

**Two things this ticket was going to deliver and did not.** The brief was posted as a chat message and
never written to the repository, so it is not recoverable by a later reader and there is nothing to
compare a future brief against. And the read-back critique of each specimen has no process trace either.
Both are process requirements with no artifact behind them, which is why the two items stay in the
verification list rather than being quietly dropped: a checklist entry nobody can verify is a claim
rather than a check, and removing it would hide the gap rather than close it.

**The screens are not here, and that is a decision rather than an omission.** This ticket named two, the
playlist detail on web and the playlist detail on mobile, and drew neither. Nothing in `PRODUCT.md`,
`ARCHITECTURE.md` or the contracts enumerates the screens, so the pair was read off the component list,
and a screen list derived from the components is a list of what can be assembled rather than of what a
user needs. The inventory is settled in
[`13-settle-the-screen-inventory`](13-settle-the-screen-inventory.md) and named as two design tasks,
`16-design-the-library` and `17-design-the-playlist-detail`, each carrying a web and a mobile
arrangement in one record. The `screens/` directory is where their specimens go, and it stands empty
until they land.

**Both dependencies are closed.** [`14-expose-the-last-sync-run`](14-expose-the-last-sync-run.md)
landed, so the sync summary and the sync error have a data source:
`GET /api/v1/playlists/:id/sync-runs/latest` returns one run and separates "no run" from "a run that
failed" by problem code at one status. And `12-rename-refresh-route-to-sync` landed, so the empty state
record's `POST /playlists/:id/sync` is now the route rather than the route's intended name.

## Context

Read `docs/adr/0009-design-system-token-layer.md` first, because it fixes how tokens are created and named and therefore how the specimens have to be set up. Then read `docs/adr/0010-tabler-icons.md`, which settles the icon provider and amends the token categories. Then read `docs/DESIGN.md`, whose tokens are provisional and are being replaced by this ticket, `packages/contracts/src/enums.ts` and `packages/contracts/src/schemas.ts`, which fix the states and fields the components must render, `docs/adr/0005-web-stack.md`, `docs/adr/0007-mobile-stack.md`, `docs/PRODUCT.md`, and `docs/GLOSSARY.md`.

The design surface is hand-written HTML under `docs/design/`, with no build step, no dependency, and no hosted tool. That is deliberate and ADR 0009 records why: a hosted tool caps iteration, rewrites the literals it stores, and can report a value that disagrees with its own rendering. Plain files are exact by construction, diffable, and free. Open a specimen from the filesystem; there is nothing to install and nothing to run.

The contract this design must satisfy is recorded in `docs/adr/0009-design-system-token-layer.md`. It is a set of requirements, not a palette. The mood and every colour value are undecided. What is already decided is listed under "Decided" below, and the design is bound by it.

## Decided

These were settled before the design work and are not reopened here.

- **Type system**: one family, IBM Plex Sans, for everything including numbers. Self-hosted on both clients, never a CDN, because the deployment is private. A second family was drafted in and then removed, which is worth recording because the reason it was removed is not obvious. It had been justified as the thing that made a duration column align. Measured in the browser at a 1000px em, Plex Sans has tabular figures by default: every digit 0 to 9 has an advance of 600, the same as a monospace face, while M and I are 812 and 400. So the column aligns with no second family and without depending on any font feature being honoured, which also settles the React Native question, since nothing needs `fontVariant` to work on Android. The specimen carrying the measurement is `docs/design/foundations/type.html`.
- **Tone count**: six tones, one per display state. `pending`, `downloading`, `stored`, `failed`, `unavailable`, and `removed`.
- **Icon provider**: Tabler, one pinned release drawn by both clients, decided in `docs/adr/0010-tabler-icons.md`. Outline by default and filled only where filled means something, colour always inherited, one weight, and no glyph drawn by hand. What is _not_ decided is the size scale, which is this ticket's work: see the token set below.
- **Component inventory**: the track row, the player bar, the empty state, and the playlist header, which replaces the "playlist view" of `docs/DESIGN.md` and is joined by a sync summary. See the components section for why the split is needed.

## Scope

### The design brief

Post the brief as a chat message before the first specimen is written, and treat it as a deliverable rather than scratch work. It names the mood candidates, the mood chosen and why it is not the first instinct, the palette with a role for each value, the type, and the direction. The mood is a physical condition or register, and every colour is derived from a named object in that scene, so the palette reads as one place rather than as a set of applied tints.

The mood, the palette, and the type scale are the open part of the brief. Do not open with a blue: the current provisional accent is the default this design exists to replace.

### The design directory

- `docs/design/` holds the work: one shared `tokens.css` of custom properties, and one HTML specimen per subject. Static files, no build step, no dependency, openable straight from the filesystem.
- The specimens are named for their subject and grouped by kind: `docs/design/foundations/` and `docs/design/components/`. The reading order is the index in `docs/design/index.html`, not a prefix on the filename. A number in a name goes stale the moment a subject is inserted ahead of it, and it carries no information the directory and the index do not already carry.
- Every specimen links the same `tokens.css` and uses `var(--token)` for every colour, size and radius. No specimen hard-codes a value it could reference, so a change to the stylesheet moves all of them at once and there is nothing to keep in sync.
- Write a specimen in one pass, then read it back and critique it before starting the next. Fix what the review finds rather than carrying it forward.
- Keep the specimens honest about what they are: a specimen that shows a forbidden pairing shows it, and its caption says why. A specimen must never assert something the artifact does not demonstrate.

### The foundations

- **Colour**: one swatch per value, each labelled with its name, its value, and its role. The text pairings are shown on the surfaces they are legal on, with the measured ratio printed on the swatch, so the contrast requirement is visible in the artifact rather than only in a table. The forbidden pairings are shown at full strength, not dimmed, because a dimmed element demonstrates nothing about the contrast inside it.
- **Type**: the scale, the weights, and the numeric role. The scale is decided here, at the specimen, and not in advance. Every step must be a visible change; a scale whose adjacent steps differ by one pixel is one size wearing six names.
- **Space, shape, and motion**: the spacing steps drawn at true size, grouped by what they are for rather than listed as a bare ramp, then a demonstration that the steps create grouping. Radii at true size. The motion durations and the stacking order, both of which the stylesheet carries even though they are not colour or spacing.
- **Focus**: the focus ring shown on each surface it has to stay visible against.

### The token set

- One `docs/design/tokens.css` holding every value as a flat custom property, with no `var()` alias, one value per category fixed in task `08`, including the font families. It is written by hand here and transcribed into `packages/tokens` by task `10`.
- An icon size scale, which ADR 0009's amendment adds to the category list. **Decided: `--icon-sm`
  16px, `--icon-md` 20px, `--icon-lg` 28px.** Decided by measuring in the controls rather than by
  reading the 24 unit grid: across the glyphs the drawn width runs from 0.17 of the box to 0.93, so
  a scale read off the grid would have put them all at one optical size when they are at four. The two
  larger steps follow a ratio to the control, 20 is 0.62 of the 32px control and 28 is 0.58 of the
  48px one, so both sit at about 0.6 and a pair of buttons reads as a pair. `--icon-sm` is the
  exception at 0.89 of the 18px checkbox, because a mark inside a control fills the control rather
  than sitting in it. `docs/design/foundations/icons.html` carries the figures.
- **Two** filled glyphs, both on the primary play button, and one nudge. A transition from a solid
  triangle to a hollow pair of bars reads as the glyph losing weight halfway through, so the endpoints
  of the morph have to agree about ink. Measured on the pin, the filled play is 26.8% of its box and
  the filled pause 32.2%. Tabler centres the play triangle on its optical bounds and not on its box, so
  it sits 1.5 of 24 units right of centre, which is 1.75px at `--icon-lg`, and is moved back as a
  position rather than a size so both clients still agree on one number per step. Four other glyphs
  are off centre by half a unit or less and are left alone. The correction is baked into the morph's
  generator rather than carried by a class, because every frame has to share one coordinate system.
- Sixteen glyphs, transcribed from `@tabler/icons` 3.48.0, held to the pin by the validator. The
  shuffle is `arrows-shuffle`, and nothing is drawn by hand.
- **One computed shape: the play to pause morph, eight frames over `--motion-base`.** Eight because
  the centre travel and the gap come out the same to two decimals at 8, 11 and 16, so the numbers do
  not choose it and 8 is the cheapest count that still reads as a shape changing. It ships as a strip
  of all eight frames inside a box the size of one, stepped across by `steps(7, jump-end)`.
  `jump-end` rather than the `jump-none` that reads more like every position counts, because measured
  over the 168 unit travel it gives seven intervals of 24 and `jump-none` gives six of 28, so the strip
  would rest between two frames for a quarter of every step. The endpoints are the pinned glyphs and
  the frames between are derived from them by `docs/design/scripts/morph-frames.mjs` and re-derived on
  every run. Three findings from building it are recorded in ADR 0010's amendment: the play triangle is
  chamfered rather than filleted and its ink is 11 square units heavier than a clean fillet; a straight
  edge cannot become a fillet by growing a radius on a fixed chord; and a bounding box cannot check
  this geometry, since a build at 25.8% ink against a pinned 32.2% had a box within 0.05 units of
  correct.
- One easing curve, and it is the only one in the system. **Decided: `--ease-standard`
  `cubic-bezier(0.4, 0, 0.2, 1)`,** which decelerates into place and never overshoots, and is soft
  enough for a border colour changing at 120ms while still carrying a 48px control at 240ms. It sits
  outside the `--motion-*` family because that family is all durations and a reader who finds a curve
  in it reads it as a time. The two decorative loops keep the `ease-in-out` keyword, because a loop is
  not a transition. This is a fourth kind of value for ADR 0009's emitter.
- The equalizer bars on playing artwork, in the playlist header and the track row. **Decided: a
  strip of 3px bars at a 4px gap reaching half way up the artwork, in `--accent`, with no scrim.**
  The count solves `7n - 4` against the content box, so 14 bars fill the 96px cover and 6 fill the
  40px thumbnail, each exactly, and the strip also carries `space-between` so the fill survives border
  snapping. The phases are `(i * stride) mod M` over `M = 2n - 1` with a stride coprime to `M`, which
  is what stops two bars sharing a phase and what stops the phases being a travelling wave. No scrim:
  a band short enough not to eat the artwork is too short to read as music. **The accepted cost is
  written down rather than discovered: `--accent` measures 5.23:1 on a #1a1a1a cover, 3.33:1 on
  #ffffff, 1.68:1 on #b8b8b8 and 1.60:1 on a #6b6b6b mid grey, and mid-tone covers are common.**
  Nothing in the tree can see that, because every specimen draws its artwork as a flat box, so a
  check for the scrim was written and withdrawn rather than left passing on a gradient that is no
  longer there. `data-state` moved from the play button to the `.hdr` and its values changed from
  `play`/`pause` to `playing`/`paused`, because the cover is the button's sibling and CSS cannot reach
  a sibling, and because a value that names a glyph is wrong on anything that is not a button.
- Skip back and track next on the playlist header, and only while it is playing. **Decided: a
  transport row of two quiet 32px steps either side of the play, above the shuffle and the overflow,
  keyed to `data-state`, and unbordered.** The header is 136px tall in every layout drawn, because the
  cover and the body both set its height, so every cost is horizontal and comes out of the title: 806px
  becomes 750px for the chosen one, 670px, **267px** for the variant that moved the transport under the
  name, and 718px for three equal boxes. The steps are unbordered so they read as the ends of the play
  rather than as two more buttons competing with the only door, and the price is that nothing marks
  where they are. That is why the target is not the box: `--control-touch` is 44px, the visible box is
  32px, and the box grows outward six pixels a side by a `::before` that paints nothing, six being what
  makes the two targets meet exactly in the middle of the 12px gap. The three-equal variant was the
  only one that would have given the steps a real touch target, and it lost because a 48px step is 0.92
  of a 48px play and filling the middle is then the only thing saying which one is the door.
- The track row's play control, which is the header's control at 28px. **Decided: same class, same
  accent fill, same `--radius-chip`, same eight-frame morph from the same generator, and the lane
  reserved on every row whether or not the control is shown.** 28px is forced by the row being 40px
  tall. It is hidden with `opacity` rather than `visibility` so it stays in the tab order, and always
  visible under `@media (hover: none)`. The lane costs 40px of the title column at 390px and changes
  no truncation outcome. Four of the seven file states have no file to play and their control is
  `disabled` rather than absent. The accepted cost is fifteen path elements per button: 240 in the
  specimen's sixteen rows and 1920 in a 128-track list, measured before it was accepted. Checks `2o`
  and `2p` hold the focus relationship and the disabled rule.
- The **screens** the product needs, which prove the palette in context rather than in isolation, are deliberately not in this ticket. The two candidates this ticket once named, the playlist detail on web and the playlist detail on mobile, were an assumption rather than a decision: nothing in `PRODUCT.md`, `ARCHITECTURE.md` or the contracts enumerates the screens, and an inventory drawn from the components is a list of what can be drawn rather than of what a user needs. Settling it is `13-settle-the-screen-inventory`, and this ticket draws no screen.
- Name every token the way the repository will name it, so the transcription needs no renaming.
- Six tone values, one per display state. `failed` and `unavailable` are both bad news but not the same
  urgency: a failed download is retried on the next sync, while an unavailable video will never become
  available, so the failed tone is the louder of the two and they do not share a hue.
- The interactive accent stays out of the fault vocabulary. Green and red are the classic colour vision
  collision and at similar lightness only hue separates them, so amber carries in-progress and green
  carries what you can act on.
- Every text pairing is measured, not judged by eye, and the measurement is written into the specimen
  next to the pairing it belongs to.

### The track row

The state space is two independent axes, not one list. `TrackFileStatus` carries `pending`, `downloading`, `stored`, `failed`, and `unavailable`, and `TrackSourceStatus` carries `available` and `removed`. Build four specimens:

- **File states**: the five `TrackFileStatus` values on the available axis.
- **Source axis**: the two combinations that carry meaning, a stored track whose source is removed, which is playable but orphaned, and an unavailable or failed track that was removed, which is retained but unplayable. These two are the product's reason for existing and get their own board rather than a footnote.
- **Interaction**: hover, focus-visible, active, and disabled.
- **Fallbacks**: the cases the schemas make possible and a state list would miss. `thumbnailPath` is nullable, so a track can have no artwork. `durationSeconds` is nullable, so it can have no duration. `failureReason` is a non-null string with no length bound, which is a layout hazard under a fixed-width title. `title` is unbounded, so truncation is decided here.

A removed track takes the removed treatment regardless of its file status, and the tone mapping that encodes that precedence is a decision for `packages/ui-foundation`, not for this ticket.

### The player bar, the empty state, and the playlist header

- **Player bar**, `docs/design/components/player-bar.html`. Two rows, 98px, with the transport on
  the bar's centre via a `1fr auto 1fr` grid, which is the only arrangement of the nine measured
  whose transport posts 0px of offset. The seeker is capped at 480px so a pixel of pointer is not a
  quarter second of music, at the cost of 419px of track. At 390 the cap and the centre are both
  dropped and the two arrangements measure identically, so the client picks by available width and no
  threshold is written into the token set. It takes no shadow, because a shadow on a dark theme is a
  dark blur over a dark page. The decision record is in
  `docs/design-system/components/player-bar.md`.
- **Empty state**, `docs/design/components/empty-state.html`. A heading, one sentence, the action
  and the promise on one axis: 204px at 1014, 285px at 390. The action is `Sync now` and there is no
  second word for it, because there is no automatic trigger in v1. The words do not change when the
  action runs, since all three are still true while it does. The decision record is in
  `docs/design-system/components/empty-state.md`.
- **Playlist header**, `docs/design/components/playlist-header.html`. Cover-led, with the states
  stacking in one list and the track count on its own line under the state, muted rather than ink. The
  count is the one number here with no field behind it, so it is derived client-side and omitted
  before the first fetch rather than shown as zero. The header carries the state and the time and
  nothing else; the fault sentence belongs to the sync error. The decision record is in
  `docs/design-system/components/playlist-header.md`, and the two files it shares its artwork and
  its controls with.
- **Sync summary**, `docs/design/components/sync-summary.html`. A row of four equal cells, each a
  figure over its own word, 66px at both widths. Figures are quiet by default and colour is spent only
  on a count that is not zero, and the order is a scale of concern rather than a palette. The label is
  "removed" rather than "gone from the source" because a 78px cell at 390 takes one line and not two.
  The decision record is in `docs/design-system/components/sync-summary.md`.
- **Sync error**, `docs/design/components/sync-error.html`. A band, and the composition of two of five
  arrangements: the framing from one and the information from the other, which cost 24px, its own
  vertical padding. The reassurance is its own line in `--muted` and is absent when there are no
  tracks. The retry is the accent button in every case, and a retry is offered only where retrying can
  work. The cap on the raw block is what makes the fourth case drawable at all. The decision record is
  in `docs/design-system/components/sync-error.md`.

There is no stored pending count anywhere in the contract, so the in-flight figure is derived
client-side from the tracks the client has already fetched.

A dependency, deliberately not resolved here and since resolved elsewhere: whether a route returns the
last sync run at all. It does, at `GET /api/v1/playlists/:id/sync-runs/latest`, added in
[`14-expose-the-last-sync-run`](14-expose-the-last-sync-run.md).

Repeated rows use fixed-width slots for artwork, the state indicator, the trailing action and the
duration, so the lanes line up across rows regardless of content.

### The mobile type wrapper

React Native has no default font inheritance for a subtree and takes a single family name, so the mobile client needs one base text wrapper that applies the family in a single place rather than restating it on every text node. It has no web counterpart, so it belongs to the mobile components and to a later mobile ticket, not to the shared layer.

### The contrast table

Record the measured contrast ratio for every text pairing the design uses, and confirm each clears AA. Looking at a specimen is not a measurement and does not substitute for one; compute the ratio from the two values and write the number down.

### `docs/DESIGN.md`

- Replace the provisional Colors, Typography, and Shapes sections with what was decided.
- Add the pieces the current document is missing: a spacing scale, a type scale with sizes, motion durations, the focus ring, the stacking order, and the track-state table.
- Record the six tones and the rule that a removed track takes the removed treatment whatever its file status.
- Give each component a usage section and its own do's and don'ts.
- Record `docs/design/` as the design source, note that the specimens are a dated snapshot rather than a live consumer, and state that changing a value means editing `packages/tokens` and re-emitting, not editing a specimen.

## Out of scope

Application code, the two packages, a light theme, iOS, and any component beyond the inventory listed under "Decided". The type scale, the mood, and every colour value are in scope here rather than out, because this is the ticket that decides them. The generic form controls, buttons, inputs, checkboxes, radios, switches and the dialog, are also out of scope and are designed in `11-form-controls`: they are platform primitives whose states are not derived from the contracts, and they need control geometry tokens that this ticket's inventory does not imply.

## Blocking edges

Blocked by `08-define-design-system`, which is resolved. Its decision, `docs/adr/0009-design-system-token-layer.md`, is in place.

## Verification

- `docs/design/tokens.css` holds the whole token set, flat, with no `var()` alias, and including `--font-ui`, and every specimen links it rather than restating a value. One family and not two: the second was drafted in and removed, and `docs/design/foundations/type.html` holds the measurement that removed it, so this line used to say "both font families" and was describing a state the ticket had already abandoned.
- The specimens cover the token set with six tones, the four track row states, the player bar, the empty state, the playlist header, the sync summary and its error state. The screens are not in this ticket: which screens the product needs is not settled, and it is settled in `13-settle-the-screen-inventory` before any of them is drawn.
- Every text pairing appears with its measured ratio and clears AA, and the measurement is computed rather than estimated.
- `docs/DESIGN.md` matches the specimens. No value in the document contradicts the design.
- The brief was posted before the first specimen was written, and each specimen was read back and critiqued before the next was started.
- The state and fallback specimens match the enums and schemas they are drawn from, with no state invented and none missing.
- No specimen hard-codes a colour, size or radius that a custom property already carries.
- Every glyph in every specimen is the pinned set's geometry, verbatim, checked by the validator against the path data for `@tabler/icons` 3.48.0. A glyph drawn by hand fails the run. The one drawing primitive outside a `<symbol>` is the morph's strip, and it is exempt from that rule only because check `2j` re-derives every frame from the generator and holds it, so the exemption is exactly as wide as the check that replaces it.
- The morph's frames are computed, not placed, and the design check proves it: the specimen's literal strip is compared against a fresh derivation, its two endpoints against the pinned path data verbatim, and its three invariants, so a hand edit to any frame fails the run.
- `pnpm run lint` and `pnpm run format` pass, since this ticket changes only documentation and static files.
