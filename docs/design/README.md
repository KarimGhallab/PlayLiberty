# Design specimens

Hand-written HTML that decide and record the design system. No build step, no dependency, no
hosted tool. Open `index.html` from the filesystem.

## What is here

```
index.html                              cover and navigation
tokens.css                              every value, as custom properties
specimen.css                            page frame, label vocabulary, fixed-width lanes
fonts.css                               three @font-face blocks
fonts/                                  IBM Plex Sans variable, Latin subset, 45 KB
foundations/                            colour, type, icons, space and shape and motion
components/                             one file per component, desktop and mobile together
screens/                                the two playlist detail screens
scripts/validate-design-tokens.cjs       twenty-two checks
scripts/morph-frames.mjs                  the play to pause frames, derived from the pin
scripts/build-morph-frames.mjs            prints them, writes the table, verifies a specimen
scripts/splice-morph-block.mjs            writes the emitted CSS block into every file that uses it
generated/play-pause-morph.json           the emitted frame table, for packages/tokens
```

`tokens.css` is a contract, not a stylesheet. Every declaration in it is a custom property and
nothing else, because it is the input that `10-build-design-foundation` transcribes into
`packages/tokens`. A rule or an at-rule in there would end up in the shipped package, so the
validator fails the build if one appears.

`specimen.css` and `fonts.css` are presentation and are free to change.

## Which side is authoritative

This matters and it changes.

While task `09` is open, **`tokens.css` is authoritative**. That is where values are decided.

Once `10-build-design-foundation` lands, **`packages/tokens` is authoritative**, because that is
what ships. After that point a value change is made in the package and re-emitted. The
specimens are a dated snapshot of what was decided and are not rewritten.

The design record is `docs/DESIGN.md` for the index and the cross-cutting rules, and
`docs/design-system/` for one file per subject, and it is the narrative record throughout. The
authority question is settled in `docs/adr/0009-design-system-token-layer.md`.

## The specimens are not the implementation

The component specimens contain flexbox and spacing that the real React and React Native
components will not share, because the two runtimes lay out differently. The specimens
illustrate; the design record specifies. Copying layout out of a specimen into a component
creates a divergence that nothing catches.

## Glyphs

Glyphs come from Tabler, pinned to one release, and the specimens carry the same artwork. A
specimen has no build step and cannot import a package, so the path data is transcribed into a
sprite at the top of each file that needs one and referenced with `<use>`. The clients do not
use those transcriptions: `apps/web` imports `@tabler/icons-react` and `apps/mobile` imports
`@tabler/icons-react-native`, both at `3.48.0`, and each depends on `@tabler/icons` at that
same exact version. `docs/adr/0010-tabler-icons.md` records the decision.

The transcription is checked, not trusted. The validator holds the pinned release's path data
and fails if a specimen's copy of a glyph differs from it by so much as half a unit, so drawing
an arrowhead by hand is a build failure rather than a divergence nobody notices until two
clients ship different artwork. A `<path>` outside a `<symbol>` is the same failure with less
ceremony, and that is the check that makes "no hand-drawn icon" a rule rather than a sentence.

No mark is typed as a character, and that is check `2g`: the track row shipped eleven vertical ellipses and three clockwise arrows as numeric character references, and every rule about glyphs in this project had been a sentence in a document rather than something the build enforced.

Two of the nineteen cannot be markup. The checkbox tick and its partial bar have to live inside a
native `<input>`, which holds no children, so they are a mask carrying the same pinned path in a
data URI and painted in `currentColor` so the mark takes the colour of the control it is in.

A glyph size is never written by hand either: the scale is three tokens, and
`foundations/icons.html` carries the measurement that decided them.

## The one computed shape

The play to pause morph is the only geometry in the system that is not in the pinned set, and it
is the only place a `<path>` is allowed outside a `<symbol>`. Its two endpoints are the pinned
glyphs, character for character, and the frames between them are computed from those two by
`scripts/morph-frames.mjs`.

```
pnpm run design:morph         print the strip and the CSS to paste into a specimen
pnpm run design:morph:json    write generated/play-pause-morph.json for packages/tokens
pnpm run design:morph:splice  write the emitted CSS block into every file that uses the control
```

The strip in `components/playlist-header.html` is literal markup, because the specimens have no
build step. That would make it a second source of truth, so check `2j` re-derives the table on
every run and fails if the file is not what the generator produces. A hand edit to a frame is a
build failure. The generator also holds the three invariants a morph has to satisfy, because a
transition has ways of being wrong that a static glyph does not: the gap between the halves
opens and never closes past zero, the ink area does not sag more than 3% below where it started,
and the centre travels no more than half a unit of the 24 unit grid.

The same is true of the CSS that drives the strip, and more strictly: `2j` compares the block
against the generator's output, so the block cannot be hand-edited at all, and the travel inside
it cannot drift from the frame count. That is why a third host went into the generator rather
than into a file. `MORPH_HOSTS` is `hdr`, `row` and `bar`, every file carries the whole list
including hosts it does not contain, and `splice-morph-block.mjs` writes the emitted block into
all of them. It finds its targets by the `data-morph` the block drives rather than from a list,
because a list goes stale the moment a component adopts the control and then fails silently: the
new file is simply absent from it, the run is clean, and the block in it is a hand copy.

A bounding box is not a check on any of this. One build had every corner of both bars bowed the
wrong way and a box within 0.05 units of correct, because the straight edges set the box and the
corners do not touch it. Only ink area showed it.

## The checks

```
node docs/design/scripts/validate-design-tokens.cjs
```

1. `tokens.css` contains only custom property declarations, and no token is declared as another
   token, which ADR 0009 rejects because React Native cannot resolve `var()`.
2. No specimen hard-codes a colour that a token carries, and no `:hover` rule paints with a tone
   token, because a tone is how a thing is and hover is not a thing.
3. Every declared text pairing clears WCAG AA and every declared control boundary clears the 3:1
   of WCAG 1.4.11, both computed from the two values rather than asserted.
4. Every ratio printed on a specimen still matches the tokens, and so does every ratio quoted in the
   design record in `docs/DESIGN.md` and `docs/design-system/`, so a stale figure is a failure rather
   than something a reader trusts.
5. Every enum value the design draws a state for has exactly one word, and the word is actually
   drawn, so no state is invented and none is missing.
6. Every glyph is the pinned set's geometry, verbatim, no mark is typed as a character, every
   button that centres an icon declares its padding, and every relative link resolves, in the
   specimens, in `docs/design-system/`, in `docs/DESIGN.md` and in the tracker.
7. The morph's frames are the generator's, a transition names a time and a curve, the equalizer's
   phases are its rule, a phased bar has a resting height, a hover-revealed control answers to
   focus, and a row with no file has a disabled play control.

Items 7 and 8 are three checks with nothing in common except that each exists because a sentence
did not notice. `2j` re-derives the play to pause frames and fails if the specimen's copy is not
what comes out, because a strip of literal markup in a file with no build step is otherwise a
second source of truth. `2k` substitutes every token in a `transition` shorthand and fails if one
resolves to a bare number or a length, because a transition has no numeric slot: the form
controls named a line height in the curve position of four transitions, each declaration was
dropped whole, and the checkbox tick, the radio dot and the switch knob snapped instead of
moving. Nothing about that was visible in a screenshot, because a control with no transition
looks exactly like a control whose transition is instant.

`2l` re-derives all twenty of the equalizer's delays and all twenty of its resting heights from
three declared parameters and the bar count in the markup, and holds the bar width, the gap and
each artwork box to the arithmetic that makes the strip span the full width. The rule it enforces
is `M = 2n - 1` with a stride coprime to `M`, and the fault it exists for is the one the article
this was built from shipped: a `-2.2s` delay on a `2.2s` animation is phase-identical to zero, so
two of its three bars move as one, and no reader of that source could have told. `2m` requires a
negative `animation-delay` to arrive with a resting value, because `animation: none` removes the
thing that was animating a transform rather than resetting it, so a phased bar with nothing to
fall back on freezes at an arbitrary height and still looks like a strip.

Items 9 and 10 are about the row's play control, which is the header's control at 28px with the
same eight-frame morph, and neither fault is visible in a screenshot. `2o` holds that a control
which is hidden at rest and revealed by `:hover` is also revealed by `:focus-within`, because
the obvious implementation of "hidden" is `visibility: hidden`, which takes the element out of
the tab order and so makes the focus reveal unreachable rather than merely unnecessary. `2p`
holds that a row whose state says the file is not on disk has a disabled play control, and that
the lane is present anyway, since a control that takes a click and does nothing is a mis-hit the
user cannot explain.

The count itself is checked. It has been wrong twice, once when check `2n` was withdrawn and
once when `2o` and `2p` were added, so the script counts its own check headers and fails if the
README disagrees.

A twentieth check was written for the equalizer and then withdrawn. The bars draw `--accent`
straight onto `coverUrl`, which is an arbitrary photograph, so a scrim was going to be required
to make their contrast computable; the scrim was dropped, and with no gradient in the tree the
check could never fire. A check that cannot fire reports a safety that is not there, so the rule
lives in prose beside the strip in `specimen.css` instead, along with the measured price of
dropping it: 1.60:1 on a #6b6b6b cover, which nothing in the tree can see, because all eight
specimens draw their artwork as a flat box the bars happen to look right on.

The pairing list and the pinned icon table both live in the script rather than in `tokens.css`,
for the same reason: a pairing is a decision about which colours are legal together and an icon
name is a decision about which glyph plays which role, and neither is a value.

## Fonts

One family. IBM Plex Sans is a variable font covering 400 to 600 in a single file, so the
weight axis is `font-weight` alone and no weight costs an extra request. It is the SIL Open
Font License.

A second family was drafted in and removed. It had been justified as the thing that made a
duration column align, and measurement in the browser showed Plex Sans already has tabular
figures by default, so it bought nothing. `foundations/type.html` carries the measurement so
the decision is not re-argued on a hunch.

`fonts.css` sets `font-display: block` deliberately. A specimen that measures whether 12px is
legible must not be read in a fallback face first and judged against the wrong metrics, and
`foundations/type.html` also checks `document.fonts` and shows a warning if a family failed to
load.
