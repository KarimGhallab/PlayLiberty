# Design the color scheme and components

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Decide the app's visual system and every token value that follows from it, as hand-written HTML specimens under `docs/design/`, then bring `docs/DESIGN.md` in line with what was decided. This ticket owns the mood, the palette, the type scale, the spacing, the shape, the motion, and the components named in `docs/DESIGN.md`. It writes no application code.

## Context

Read `docs/adr/0009-design-system-token-layer.md` first, because it fixes how tokens are created and named and therefore how the specimens have to be set up. Then read `docs/DESIGN.md`, whose tokens are provisional and are being replaced by this ticket, `packages/contracts/src/enums.ts` and `packages/contracts/src/schemas.ts`, which fix the states and fields the components must render, `docs/adr/0005-web-stack.md`, `docs/adr/0007-mobile-stack.md`, `docs/PRODUCT.md`, and `docs/GLOSSARY.md`.

The design surface is hand-written HTML under `docs/design/`, with no build step, no dependency, and no hosted tool. That is deliberate and ADR 0009 records why: a hosted tool caps iteration, rewrites the literals it stores, and can report a value that disagrees with its own rendering. Plain files are exact by construction, diffable, and free. Open a specimen from the filesystem; there is nothing to install and nothing to run.

The contract this design must satisfy is recorded in `docs/adr/0009-design-system-token-layer.md`. It is a set of requirements, not a palette. The mood and every colour value are undecided. What is already decided is listed under "Decided" below, and the design is bound by it.

## Decided

These were settled before the design work and are not reopened here.

- **Type system**: one family, IBM Plex Sans, for everything including numbers. Self-hosted on both clients, never a CDN, because the deployment is private. A second family was drafted in and then removed, which is worth recording because the reason it was removed is not obvious. It had been justified as the thing that made a duration column align. Measured in the browser at a 1000px em, Plex Sans has tabular figures by default: every digit 0 to 9 has an advance of 600, the same as a monospace face, while M and I are 812 and 400. So the column aligns with no second family and without depending on any font feature being honoured, which also settles the React Native question, since nothing needs `fontVariant` to work on Android. The specimen carrying the measurement is `docs/design/foundations/type.html`.
- **Tone count**: six tones, one per display state. `pending`, `downloading`, `stored`, `failed`, `unavailable`, and `removed`.
- **Component inventory**: the track row, the player bar, the empty state, and the playlist header, which replaces the "playlist view" of `docs/DESIGN.md` and is joined by a sync summary. See the components section for why the split is needed.

## Scope

### The design brief

Post the brief as a chat message before the first specimen is written, and treat it as a deliverable rather than scratch work. It names the mood candidates, the mood chosen and why it is not the first instinct, the palette with a role for each value, the type, and the direction. The mood is a physical condition or register, and every colour is derived from a named object in that scene, so the palette reads as one place rather than as a set of applied tints.

The mood, the palette, and the type scale are the open part of the brief. Do not open with a blue: the current provisional accent is the default this design exists to replace.

### The design directory

- `docs/design/` holds the work: one shared `tokens.css` of custom properties, and one HTML specimen per subject. Static files, no build step, no dependency, openable straight from the filesystem.
- The specimens are numbered in the order they are built: `01-color.html`, `02-type.html`, `03-space-shape-motion.html`, then the components, then the screens. The number is the reading order and nothing more.
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
- Name every token the way the repository will name it, so the transcription needs no renaming.
- Six tone values, one per display state. `failed` and `unavailable` are both bad news but not the same urgency: a failed download is retried on the next refresh, while an unavailable video will never become available, so the failed tone is the louder of the two and they do not share a hue.
- The interactive accent stays out of the fault vocabulary. Green and red are the classic colour vision collision and at similar lightness only hue separates them, so amber carries in-progress and green carries what you can act on.
- Every text pairing is measured, not judged by eye, and the measurement is written into the specimen next to the pairing it belongs to.

### The track row

The state space is two independent axes, not one list. `TrackFileStatus` carries `pending`, `downloading`, `stored`, `failed`, and `unavailable`, and `TrackSourceStatus` carries `available` and `removed`. Build four specimens:

- **File states**: the five `TrackFileStatus` values on the available axis.
- **Source axis**: the two combinations that carry meaning, a stored track whose source is removed, which is playable but orphaned, and an unavailable or failed track that was removed, which is retained but unplayable. These two are the product's reason for existing and get their own board rather than a footnote.
- **Interaction**: hover, focus-visible, active, and disabled.
- **Fallbacks**: the cases the schemas make possible and a state list would miss. `thumbnailPath` is nullable, so a track can have no artwork. `durationSeconds` is nullable, so it can have no duration. `failureReason` is a non-null string with no length bound, which is a layout hazard under a fixed-width title. `title` is unbounded, so truncation is decided here.

A removed track takes the removed treatment regardless of its file status, and the tone mapping that encodes that precedence is a decision for `packages/ui-foundation`, not for this ticket.

### The player bar, the empty state, and the playlist header

- **Player bar**, persistent across the app: transport, the current track, the position indicator, and its reduced-motion variant.
- **Empty state**, shown before the first sync, which is also the state where `lastSyncedAt` is still null: it explains the one action that matters.
- **Playlist header**: cover, name, sync status, and the last synced time. Every field comes from `PlaylistSchema`.
- **Sync summary**: the outcome of the last run, which is what was added, retained, removed, and failed, when it finished, and the error when there is one. Every field comes from `SyncRunSchema`, a different record with a different lifetime, which is why this is a component of its own. It gives `retainedCount` a deliberate position on screen, because that number is the product's promise stated as a figure.
- **Sync error**: `PlaylistSyncStatus.Error` and a non-null `SyncRun.error` are both reachable and neither is in the original inventory. A failed sync is exactly when the user needs to know what happened, and it is exactly where the do's and don'ts could tempt a designer into silence. Draw it.

There is no stored pending count anywhere in the contract. A pending or downloading figure is derived client-side from the tracks the client has already fetched, so the design shows a derived in-flight figure while a run is active rather than a stored count.

Note as a dependency, and do not resolve here: whether the playlist endpoint returns the last sync run at all. If it does not, the sync summary has nothing to bind to and that is server work.

Repeated rows use fixed-width slots for artwork, the state indicator, the trailing action, and the duration, so the lanes line up across rows regardless of content. Trace the vertical line through the slots rather than trusting that a gap did it.

### The mobile type wrapper

React Native has no default font inheritance for a subtree and takes a single family name, so the mobile client needs one base text wrapper that applies the family in a single place rather than restating it on every text node. It has no web counterpart, so it belongs to the mobile components and to a later mobile ticket, not to the shared layer.

### The screens

Two screens that prove the palette in context rather than in isolation: the playlist detail on desktop web, and the playlist detail on mobile with the player bar. These are the two shapes ADR 0005 and ADR 0007 actually build.

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

- `docs/design/tokens.css` holds the whole token set, flat, with no `var()` alias, and including both font families, and every specimen links it rather than restating a value.
- The specimens cover the token set with six tones, the four track row states, the player bar, the empty state, the playlist header, the sync summary and its error state, and the two screens.
- Every text pairing appears with its measured ratio and clears AA, and the measurement is computed rather than estimated.
- `docs/DESIGN.md` matches the specimens. No value in the document contradicts the design.
- The brief was posted before the first specimen was written, and each specimen was read back and critiqued before the next was started.
- The state and fallback specimens match the enums and schemas they are drawn from, with no state invented and none missing.
- No specimen hard-codes a colour, size or radius that a custom property already carries.
- `pnpm run lint` and `pnpm run format` pass, since this ticket changes only documentation and static files.
