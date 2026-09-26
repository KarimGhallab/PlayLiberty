# Design the color scheme and components in Paper

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Decide the app's visual system and every token value that follows from it, in a Paper file, then bring `docs/DESIGN.md` in line with what was decided. This ticket owns the mood, the palette, the typography, the spacing, the shape, the motion, and the four components named in `docs/DESIGN.md`. It writes no application code.

## Context

Read `docs/adr/0009-design-system-token-layer.md` first, because it fixes how tokens are created and named and therefore how the Paper work has to be set up. Then read `docs/DESIGN.md`, whose tokens are provisional and are being replaced by this ticket, `docs/adr/0005-web-stack.md`, `docs/adr/0007-mobile-stack.md`, `docs/PRODUCT.md`, and `docs/GLOSSARY.md`.

The Paper MCP server is the design surface. No Paper file exists yet, so this ticket creates one. Load the Paper MCP instructions guide before the first tool call and follow it, including its mandatory review checkpoints and its rule that screenshots verify quality and are never an input to code.

The contract this design must satisfy is recorded in `docs/adr/0009-design-system-token-layer.md`. It is a set of requirements, not a palette. Nothing in this ticket is pre-decided.

## Scope

### The design brief

Post the brief as a chat message before touching the canvas, and treat it as a deliverable rather than scratch work. It names the mood candidates, the mood chosen and why it is not the first instinct, the palette with a role for each value, the type, and the direction. The mood is a physical condition or register, and every color is derived from a named object in that scene, so the palette reads as one place rather than as a set of applied tints.

### The Paper file

- One file for the system, with pages for foundations, components, and screens.
- Write in small pieces, one visual group at a time, so the work is reviewable while it happens.
- Screenshot and critique at each checkpoint, covering spacing, hierarchy, contrast, alignment, artboard fit, and repetition. Fix what the review finds before moving on.
- Close with the tool that marks the work finished.

### The token set

- Create the tokens in Paper as flat CSS custom properties, with no `var()` alias, one value per category fixed in task `08`.
- Name every token the way the repository will name it, so the exported stylesheet needs no renaming.
- One value per track state, so all five states are expressible.
- Read the tokens back with Paper's token reader in CSS form and confirm every token is present.

### The components

Each component is drawn in every state it has to express, and each state carries a label, never color alone.

- **Track row**, the core unit that appears in every list: the five track states, a removed-but-retained video, and the interaction states including hover, focus-visible, active, and disabled.
- **Player bar**, persistent across the app: transport, the current track, the position indicator, and its reduced-motion variant.
- **Empty state**, shown before the first sync: it explains the one action that matters.
- **Playlist view**: last synced, the counts, and the removed videos that were retained.

Repeated rows use fixed-width slots for icons, indicators, and trailing actions so the lanes line up across rows. Verify the alignment by screenshot rather than by eye.

### The screens

Two screens that prove the palette in context rather than in isolation: the playlist detail on desktop web, and the playlist detail on mobile with the player bar. These are the two shapes ADR 0005 and ADR 0007 actually build.

### The contrast table

Record the measured contrast ratio for every text pairing the design uses, and confirm each clears AA. A screenshot does not prove this and does not substitute for the table.

### `docs/DESIGN.md`

- Replace the provisional Colors, Typography, and Shapes sections with what was decided.
- Add the pieces the current document is missing: a spacing scale, a type scale with sizes, motion durations, the focus ring, the stacking order, and the track-state table.
- Give each named component a usage section and its own do's and don'ts.
- Record the Paper file as the design source, and record that changing the palette means re-running the extraction by hand.

## Out of scope

Application code, the two packages, a light theme, iOS, and any change to the component inventory beyond the four already named.

## Blocking edges

Blocked by `08-define-design-system`, which fixes the token mechanics the Paper setup depends on.

## Verification

- The Paper file holds the token set, the four components in all their states, and the two screens.
- Every text pairing appears in the contrast table and clears AA.
- The token reader returns every token in CSS form, flat, with no alias.
- `docs/DESIGN.md` matches Paper. No value in the document contradicts the design.
- The brief was posted before the first canvas mutation, and the review checkpoints were taken.
- `pnpm run lint` and `pnpm run format` pass, since this ticket changes only documentation.
