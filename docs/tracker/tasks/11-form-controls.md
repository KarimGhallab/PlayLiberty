# Design the form controls

Status: resolved
Labels: `enhancement`

## Objective

Decide the generic interactive controls the product needs, as hand-written HTML specimens under `docs/design/components/`, and add any token they turn out to require. These are the primitives every screen is assembled from, so a control that is wrong here is wrong everywhere. It writes no application code.

## Outcome

`docs/design/components/form-controls.html` draws button, text input, checkbox, radio, segmented control, switch, dialog and the emphasis pattern. `docs/design/foundations/color.html` presents the emphasis colour as a colour in its own right. `docs/design/tokens.css` grew from 51 to 59 values. The validator went from six checks to ten, and gained the ability to resolve a token declared as another token.

Seven decisions in here, each forced by measurement, the platform or the naming. The reasoning for
each is in `docs/design-system/components/form-controls.md`.

- **A control boundary is not a hairline.** `--line` is 1.28:1 on `--surface` and is right for
  separating rows, but it is wrong for outlining something clickable. `--control-border` at `#6e7379`
  is 3.42:1 on the worst surface, the 3:1 WCAG 1.4.11 asks of a control boundary, and the suite checks
  boundaries at 3:1 so that a colour which passes every text pairing and is still too faint to see a
  checkbox by cannot recur.
- **A disabled control is measured, not faded.** `--opacity-disabled` at 0.45 takes ink to 3.93:1 and a
  muted label to 2.15:1, both under AA. Disabled therefore has its own pair, at 4.65:1 for a label on
  its own fill, and a darker fill fails on the text it has to carry.
- **A busy control is not a disabled one.** A syncing button that greys out the instant it is pressed
  reads as a refusal. Busy keeps the variant's colours and takes a `currentColor` spinner.
- **Hover lifts the accent instead of changing hue.** `--accent-hover` is the accent lifted, 1.24x the
  luminance, and the legend improves to 7.05:1. Applied to pressable accent fills only, not to a
  checked box, whose fill is a state rather than an invitation to press.
- **A text input has no focus ring.** The border carries focus, `--control-border` to `--accent`, which
  is a hue shift and clears 3:1 at 5.85:1. A weaker indicator than an offset ring, because the
  alternative is no focus indicator at all, which fails WCAG 2.4.7.
- **Amber is `--emphasis`, and the downloading tone holds the same literal.** The two hold `#e39a3c`
  each and a check fails if they ever diverge, because ADR 0009 rejects aliased tokens and React Native
  cannot resolve `var()`. Three rules govern the colour's use: one emphasis per view, always with a
  word, and never on a hover. They can share a value because they never compete, since download
  concurrency is capped at 2.
- **The segmented control has no fill on its selection.** Filling it with `--surface-raised` is 1.19:1
  in a `--bg` track and 1.00:1 inside the dialog, where the track is the dialog's own fill. No dark grey
  in the palette fixes it: they land between 1.15:1 and 1.80:1, and one strong enough to read fails the
  label on it. The selection is a rule under the option plus a step from `--muted` to `--ink`.

The controls are native elements. Checkboxes and radios are `input` elements with `appearance: none`,
and their tick and partial bar are Tabler's `check` and `minus` delivered as a mask carrying the pinned
path in a data URI, because a native `input` holds no children and a mask is the one form of SVG that
can live in a pseudo-element. A glyph is a font decision and this ships as a package, so nothing is
typed.

Decided: `ShareLevel` uses the segmented control, not a radio, because sharing is a permission the owner
reads back rather than a form they submit. Radio stays in the system and is drawn.

`--opacity-scrim` was replaced by `--scrim`, a colour rather than a bare alpha, because a composable
opacity would let a consumer invent a scrim nobody decided on.

`--emphasis` is presented in `docs/design/foundations/color.html` as a section of its own beside the
accent: the swatch and its ratio on `--surface`, the two shapes it is allowed to take, and the three
rules that govern it.

## Context

Read `docs/adr/0009-design-system-token-layer.md` first, then `docs/DESIGN.md` and `docs/design/README.md`, which together record what is already decided. Then read `packages/contracts/src/enums.ts`, which is what implies the controls in the first place, and `docs/tracker/tasks/09-design-scheme-and-components.md`, which covers the app-specific components and deliberately excludes this work.

The design surface is hand-written HTML under `docs/design/`, with no build step, no dependency, and no hosted tool. `tokens.css` is a contract rather than a stylesheet, and the validator enforces that it stays one. Every specimen links it and uses `var(--token)` for every value.

The domain implies these controls rather than inventing them:

- `ShareLevel` is `Read` or `Write`, which is two mutually exclusive values and therefore a radio or a segmented pair, and sharing is how a playlist is handed to another account.
- Adding one pasted video to several write-accessible playlists at once is a multi-select and therefore checkboxes.
- A playlist or video URL is pasted into a text input.
- Sharing is modal, so a dialog and its scrim.

## Scope

### The controls

Each is drawn in every state it has to express, and each state carries a visible label, mark or movement, never colour alone.

- **Button**, in primary, secondary and quiet, plus disabled, unavailable and busy. Primary is the deep
  green accent with a near-black legend, since that pairing is measured at 5.85:1 and the inverse is
  the pairing the system forbids.
- **Text input**, in default, focused, filled, invalid and disabled, with its label, its placeholder and its error message. Invalid keeps the text in ink so it can be corrected, and puts the red on the border and on a message.
- **Checkbox**, including the indeterminate state, which is the one that is easy to forget and the one a partial selection needs. Set through the DOM property, since `:indeterminate` is not an attribute.
- **Radio**, and a segmented control as the better fit for a two-value `ShareLevel`. Both drawn, with the choice and its reason stated.
- **Switch**, as a `button` with `role="switch"`, since there is no native switch and a checkbox styled as a pill loses the semantic.
- **Dialog**, with its scrim, since sharing is the modal case.

### The tokens this added

Eight, plus one replacement, each with its reasoning in the token comment rather than a bare value.

- `--control-border`, because `--line` at 1.28:1 is too faint to outline something clickable and `--muted` at 5.71:1 turns a column of controls into the loudest thing on screen.
- `--control-height` at 36px, and separately `--control-touch` at 44px, because a comfortable desktop control and a comfortable thumb are different constraints.
- `--control-size-check` at 18px, the box a checkbox and a radio draw in.
- `--control-disabled-fg` and `--control-disabled-bg`, because a blanket opacity fails the text.
- `--accent-hover`, because hover has to lift the accent and repainting it in a tone was the mistake described above.
- `--emphasis`, because the second colour needed a name that said what it was for, and `--tone-downloading` said what it was not for.

`--opacity-scrim` was replaced rather than added to. It was a bare `0.6`, so `background: var(--opacity-scrim)` was not valid CSS and the scrim computed to fully transparent. `--scrim` is a colour, and a composable alpha would have let a consumer invent a scrim nobody decided on.

Two things the ticket predicted turned out not to need tokens. The check glyph and the radio dot were drawn, not tokenised, because a glyph is a font decision and a shipped package will be loaded alongside fonts the design never saw. The second half of that still holds and the first half does not: the check glyph is now the pinned set's, at one of three icon size tokens rather than at no token at all, and the radio dot is still drawn because it is control geometry rather than a glyph. The distinction the ticket did not have is the one that separates them, and it is recorded on `foundations/icons.html`. A checked background did not need one either: the checked fill is `--accent` directly, since duplicating that value into a second token is the drift this system already avoids elsewhere. That reasoning is why `--tone-downloading` and `--emphasis` are both checked against each other rather than left as a comment asking people not to change one without the other. They cannot be one token aliasing the other, since ADR 0009 rejects that, so a shared literal held by a check is the honest form of the same idea.

## Verification

- [x] `pnpm run design:check` passes, 59 values, 0 raw colour literals, 0 stale ratios, 0 dangling tokens, 0 tone hovers, 0 dead links, 35 text pairings at 4.5:1 with 1 ruled out, 10 control boundaries at 3:1 with 3 ruled out, 19 rejected candidates held at their measured values.
- [x] Every interactive element is reachable by keyboard and shows a visible focus indicator. Verified by focusing all 28 in turn: 28 focusable elements, every one with a role and an accessible name, disabled controls correctly skipped, the radio group one tab stop as the platform intends. 24 of the 28 resolve to a 1.6px accent ring at a 1.6px offset. The other 4 are the text inputs, which deliberately have no ring and carry focus on the border instead, from `--control-border` to `--accent`; that change was confirmed to actually happen rather than assumed. The breadcrumb link keeps the user agent's own focus ring rather than the token, which is a small inconsistency worth closing if the specimen chrome is ever promoted to a real header.
- [x] Every control's states are distinguishable without colour: the checked box has a drawn tick, the radio a dot, the switch a travelling knob, the invalid input a sentence, the segmented selection a rule under the option.
- [x] The measured contrast of each state that renders text is recorded, including disabled at 4.65:1, which was the one most likely to fail.
- [x] `prefers-reduced-motion` is honoured. The spinner stops and its cut top is restored, because a frozen ring with a notch reads as broken and the word is what carries the state.
- [x] `pnpm run lint`, `pnpm run format` and `pnpm run build` pass.

## What the validator gained

The suite went from six checks to ten, plus a record of rejected values.

- **Control boundaries at 3:1**, a separate rule from the text rule. A colour can pass every text pairing in the system and still be too faint to see a checkbox by. A translucent backdrop is composited before it is compared, so the dialog's edge is measured against what the scrim actually produces.
- **Ruled-out pairings recorded, not deleted.** One known-bad text pairing and three known-bad boundaries are declared with a `FORBIDDEN` prefix, measured and reported, and excluded from the "tightest" figure. The report names the tightest pair that has to hold, not the tightest pair that was deliberately broken. The text report was doing this too late and initially named the forbidden pairing as the one to watch, which is the same mistake one layer down.
- **Rejected candidates held at their measured values**, so a document can say what the alternatives were without those numbers going stale. Nineteen of them, including the by-eye control border at 2.21:1, the segmented fills, the amber hover that measured well and was still wrong, and the darker disabled fills that dropped their own labels under AA.
- **The dangling-reference check scans opted-out files.** It only scanned non-opted-out ones, so a prototype declaring a token in-page escaped it entirely, and opting out of the colour-literal rule silently exempted a file from token checking too. Those are unrelated concerns and they were coupled. The control-border prototype that exposed this has since been deleted, so nothing is opted out at the moment, but the check stands for the next one.
- **A composited colour is quantised to 8 bits before it is measured**, because that is what the compositor puts on the screen. A float-only calculation reported 3.91:1 for ink at 45% where the display shows 3.93:1, and the display is the thing a reader can pick and measure.
- **The AA and non-text thresholds are recognised as policy** rather than measurements, so a document may name them.
- **Aliased tokens are now rejected outright, and shared values are held instead.** `--tone-downloading: var(--emphasis)` shipped for a while and violated ADR 0009, which rejects aliased tokens because React Native cannot resolve `var()`. A check now fails on any token declared as another token, and a second check requires the pairs listed as one decision to hold the same literal. `resolve()` stayed, so a violation is measured correctly and the error names the ADR rather than reporting a nonsense ratio. The dangling-reference check also learned to strip comments first, after it caught a reference inside a comment that was explaining the very mistake it was quoting, and `tokens.css` is now scanned for its own references.
- **A tone token may not appear in a hover rule.** The amber hover passed every numeric check, which is the problem: it is the one mistake in this system that measurement cannot catch, because a tone is how a thing _is_ and hover is not a thing. It is now forbidden outright, and the check reports one line per offending rule rather than per declaration.
- **Dead links are caught.** The index listed five specimens that did not exist as live links, so a reader clicking through the design system discovered the state of the work by hitting a 404. Unbuilt entries are text marked "not drawn yet", and a link check keeps the two distinguishable as the tree grows.

## Out of scope

The four app-specific components and the two screens, which belong to task `09`. Application code, the two packages, a light theme, and iOS.

## Blocking edges

None. It is independent of task `09`, and it blocks nothing. The two screens do depend on it, and that work happens after both tickets close.
