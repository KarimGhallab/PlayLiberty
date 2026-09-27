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
foundations/                            colour, type, space and shape and motion
components/                             one file per component, desktop and mobile together
screens/                                the two playlist detail screens
scripts/validate-design-tokens.cjs       four checks
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

`docs/DESIGN.md` is the narrative record throughout, and the authority question is settled in
`docs/adr/0009-design-system-token-layer.md`.

## The specimens are not the implementation

The component specimens contain flexbox and spacing that the real React and React Native
components will not share, because the two runtimes lay out differently. The specimens
illustrate; `docs/DESIGN.md` specifies. Copying layout out of a specimen into a component
creates a divergence that nothing catches.

## The checks

```
node docs/design/scripts/validate-design-tokens.cjs
```

1. `tokens.css` contains only custom property declarations.
2. No specimen hard-codes a colour that a token carries.
3. Every declared text pairing clears WCAG AA, computed from the two values.
4. Every ratio printed on a specimen still matches the tokens, so a stale figure is a failure
   rather than something a reader trusts.

The pairing list lives in the script, not in `tokens.css`, because a pairing is a decision about
which colours are legal together rather than a value.

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
