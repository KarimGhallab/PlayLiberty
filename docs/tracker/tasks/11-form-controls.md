# Design the form controls

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Objective

Decide the generic interactive controls the product needs, as hand-written HTML specimens under `docs/design/components/`, and add any token they turn out to require. These are the primitives every screen is assembled from, so a control that is wrong here is wrong everywhere. It writes no application code.

## Outcome

`docs/design/components/form-controls.html` draws button, text input, checkbox, radio, segmented control, switch and dialog. `docs/design/tokens.css` grew from 51 to 57 values. The validator grew a seventh check.

Five things in here are worth reading, because in each case the first answer looked right and measurement or the platform refused it:

- **A control boundary is not a hairline.** `--line` is 1.28:1 on `--surface` and is right for separating rows. It is wrong for outlining something clickable, and the track row's action lane was using it, which made the control invisible. `--control-border` at `#6e7379` is 3.42:1 on the worst surface, the 3:1 WCAG 1.4.11 asks of a control boundary. The value first chosen by eye measured 2.21:1 and was thrown out; the suite now checks boundaries at 3:1 so that cannot recur.
- **A disabled control is measured, not faded.** `--opacity-disabled` at 0.45 takes ink to 3.93:1 and a muted label to 2.15:1, both under AA. Disabled therefore has its own pair, at 4.65:1 for a label on its own fill. A darker fill fails on the text it has to carry, which is why the value is what it is.
- **A busy control is not a disabled one.** The first draft shared a rule between the two, so a syncing button greyed out the instant it was pressed, which reads as a refusal. Busy keeps the variant's colours and takes a `currentColor` spinner.
- **Hover lifts the accent instead of changing hue.** It went to `--tone-downloading` first, which contradicted the rule that the accent stays out of the progress and fault vocabulary, and it made hover into an emphasis, which is noise at the frequency a pointer crosses a button. `--accent-hover` is the accent lifted, 1.24x the luminance, and the legend improves to 7.05:1. Applied to pressable accent fills only, not to a checked box, whose fill is a state rather than an invitation to press.
- **A text input has no focus ring.** It had two and they were nested: `:focus-within` drew one around the whole field block, boxing in the label, and `:focus-visible` drew another around the input. The border carries focus now, `--control-border` to `--accent`, which is a hue shift and clears 3:1 at 5.85:1. A weaker indicator than an offset ring, deliberately, because the alternative was none at all.
- **Amber is `--emphasis`, and the downloading tone aliases it.** The first cut called the emphasis colour `--tone-downloading`, which was a name lying about its own job: a colour whose name says "downloading" cannot honestly be used to emphasise something that is not downloading. It is now `--emphasis`, and `--tone-downloading: var(--emphasis)`. One declaration, two names, so they cannot drift apart, and the dependency points from the state to the colour because "in progress" is a mild form of "needs attention". Three rules govern its use: one emphasis per view, always with a word, and never on a hover. They can share a value because they never compete, since download concurrency is capped at 2.
- **The segmented control has no fill on its selection.** Filling it with `--surface-raised` is 1.19:1 in a `--bg` track and 1.00:1 inside the dialog, where the track is the dialog's own fill. No dark grey in the palette fixes it: they land between 1.15:1 and 1.80:1, and one strong enough to read fails the label on it. The selection is a rule under the option plus a step from `--muted` to `--ink`.
- **The controls are native elements.** The first draft drew checkboxes and radios as spans, which looked identical and could not take focus: five checkboxes, none keyboard reachable. They are now `input` elements with `appearance: none`, and the tick and the partial bar are drawn in CSS rather than typed, because a glyph is a font decision and this ships as a package.

Decided: `ShareLevel` uses the segmented control, not a radio, because sharing is a permission the owner reads back rather than a form they submit. Radio stays in the system and is drawn.

`--opacity-scrim` was retired and replaced by `--scrim`, a colour rather than a bare alpha, because `background: var(--opacity-scrim)` was not valid CSS and a composable opacity would let a consumer invent a scrim nobody decided on.

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

- **Button**, in primary, secondary and quiet, plus disabled, unavailable and busy. Primary is the deep green accent with a near-black legend, since that pairing is measured at 5.85:1 and the inverse is the pairing the system forbids. The ticket originally said "amber accent" here, which was wrong: amber is `--tone-downloading`.
- **Text input**, in default, focused, filled, invalid and disabled, with its label, its placeholder and its error message. Invalid keeps the text in ink so it can be corrected, and puts the red on the border and on a message.
- **Checkbox**, including the indeterminate state, which is the one that is easy to forget and the one a partial selection needs. Set through the DOM property, since `:indeterminate` is not an attribute.
- **Radio**, and a segmented control as the better fit for a two-value `ShareLevel`. Both drawn, with the choice and its reason stated.
- **Switch**, as a `button` with `role="switch"`, since there is no native switch and a checkbox styled as a pill loses the semantic.
- **Dialog**, with its scrim, since sharing is the modal case.

### The tokens this added

Six, each with its reasoning in the token comment rather than a bare value.

- `--control-border`, because `--line` at 1.28:1 is too faint to outline something clickable and `--muted` at 5.71:1 turns a column of controls into the loudest thing on screen.
- `--control-height` at 36px, and separately `--control-touch` at 44px, because a comfortable desktop control and a comfortable thumb are different constraints.
- `--control-size-check` at 18px, the box a checkbox and a radio draw in.
- `--control-disabled-fg` and `--control-disabled-bg`, because a blanket opacity fails the text.

Two things the ticket predicted turned out not to need tokens. The check glyph and the radio dot are drawn, not tokenised, because a glyph is a font decision and a shipped package will be loaded alongside fonts the design never saw. A checked background did not need one either: the checked fill is `--accent` directly, since duplicating that value into a second token is the drift this system already avoids elsewhere.

## Verification

- [x] `pnpm run design:check` passes, 57 values, 0 raw colour literals, 0 stale ratios, 0 dangling tokens, 31 text pairings at 4.5:1, 7 control boundaries at 3:1, 2 ruled out and recorded, 16 rejected candidates held at their measured values.
- [x] Every interactive element is reachable by keyboard and shows a visible focus ring. Verified by tabbing: 28 focusable elements, all with a role and an accessible name, all resolving to a 1.6px accent ring at a 1.6px offset. Disabled controls are correctly skipped. The radio group is one tab stop, as the platform intends.
- [x] Every control's states are distinguishable without colour: the checked box has a drawn tick, the radio a dot, the switch a travelling knob, the invalid input a sentence, the segmented selection a rule under the option.
- [x] The measured contrast of each state that renders text is recorded, including disabled at 4.65:1, which was the one most likely to fail.
- [x] `prefers-reduced-motion` is honoured. The spinner stops and its cut top is restored, because a frozen ring with a notch reads as broken and the word is what carries the state.
- [x] `pnpm run lint`, `pnpm run format` and `pnpm run build` pass.

## What the validator gained

The suite went from six checks to ten, plus a record of rejected values.

- **Control boundaries at 3:1**, a separate rule from the text rule. A colour can pass every text pairing in the system and still be too faint to see a checkbox by. A translucent backdrop is composited before it is compared, so the dialog's edge is measured against what the scrim actually produces.
- **Ruled-out pairings recorded, not deleted.** The known-bad text pairing and two known-bad boundaries are declared with a `FORBIDDEN` prefix, measured and reported, and excluded from the "tightest" figure. The report names the tightest pair that has to hold, not the tightest pair that was deliberately broken.
- **Rejected candidates held at their measured values**, so a document can say what the alternatives were without those numbers going stale. Sixteen of them, including the by-eye control border at 2.21:1 and the segmented fills.
- **The dangling-reference check now scans opted-out files.** It only scanned non-opted-out ones, so a prototype declaring a token in-page escaped it entirely, and opting out of the colour-literal rule silently exempted a file from token checking too. Those are unrelated concerns and they were coupled.
- **A composited colour is quantised to 8 bits before it is measured**, because that is what the compositor puts on the screen. A float-only calculation reported 3.91:1 for ink at 45% where the display shows 3.93:1, and the display is the thing a reader can pick and measure.
- **The AA and non-text thresholds are recognised as policy** rather than measurements, so a document may name them.
- **Tokens may be declared as other tokens, and the validator resolves them.** `resolve()` follows a `var()` chain to any depth, reports a cycle once rather than once per lookup, and `tokens.css` is now scanned for dangling references so an alias cannot point at a name that does not exist. Every colour lookup goes through it, so all 33 text pairings and 10 boundaries measure the resolved value. Without this, `--tone-downloading: var(--emphasis)` would have been two names that could quietly disagree.
- **A tone token may not appear in a hover rule.** The amber hover passed every numeric check, which is the problem: it is the one mistake in this system that measurement cannot catch, because a tone is how a thing _is_ and hover is not a thing. It is now forbidden outright, and the check reports one line per offending rule rather than per declaration.
- **Dead links are caught.** The index listed five specimens that did not exist as live links, so a reader clicking through the design system discovered the state of the work by hitting a 404. Unbuilt entries are text marked "not drawn yet", and a link check keeps the two distinguishable as the tree grows.

## Out of scope

The four app-specific components and the two screens, which belong to task `09`. Application code, the two packages, a light theme, and iOS.

## Blocking edges

None. It is independent of task `09`, and it blocks nothing. The two screens do depend on it, and that work happens after both tickets close.
