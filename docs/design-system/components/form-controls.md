# Form controls

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

`docs/design/components/form-controls.html` draws the primitives.

**A control boundary is not a hairline.** `--line` measures 1.28:1 on `--surface` and is right for
separating rows from each other, which is a job it does well. It is wrong for outlining something you can
click: the track row's action lane is drawn with `--control-border` at `#6e7379`, which measures 3.42:1 on
`--surface-raised` and 3.76:1 on `--surface`, and is the 3:1 WCAG 1.4.11 asks of a control boundary. The
suite checks boundaries at 3:1, which is a different rule from the text rule and catches a different
mistake: a colour can pass every text pairing in this system and still be too faint to see a checkbox by.

**A disabled control is measured, not faded.** `--opacity-disabled` at 0.45 drags the label down with the
control, to 3.93:1 for ink and 2.15:1 for a muted label, both under AA. So disabled has its own pair.
`--control-disabled-fg` is ink at 55%, which is 5.24:1 on `--surface` and 4.65:1 on its own fill. The fill
is the lightest value that still reads as a filled object at all: darker options measure 1.07:1 and 1.13:1
against the surface, but a darker fill also drops the label, to 4.42:1 and 4.15:1, so the darker options
fail on the text they are supposed to carry. A disabled fill is deliberately absent from the 3:1 check,
because 1.4.11 exempts inactive components and a dead control that looks live is worse than one that looks
dead.

**Hover lifts the accent; it never changes hue.** The accent deliberately stays out of the progress and
fault vocabulary so the three never get confused, and a hover that turns the action colour into the
progress colour means the same control changes meaning depending on where the pointer is. `--accent-hover`
is the accent lifted, same hue at 1.24x the luminance, and the near-black legend gets _better_ rather than
worse: 7.05:1 against the resting 5.85:1, because dark ink on a lighter fill is more contrast, not less. It
applies to a pressable accent fill, which is the primary button and the switch. It does not apply to a
checked box, because that fill is a state rather than an invitation to press, and a state that moves when
the pointer crosses it stops being a state you can read at rest.

**Amber is `--emphasis`, and the downloading tone holds the same value.** Both are `#e39a3c`, two names
for one decision, and the suite fails if they ever stop agreeing. They cannot be one token pointing at the
other, because ADR 0009 rejects aliased tokens: React Native cannot resolve `var()`. "In progress" is a
mild form of "needs attention" and emphasis is the broader of the two ideas, so a state sharing a colour's
name is ordinary; a colour borrowing a state name is the thing this system exists to avoid. The two can
share a value because they never compete: download concurrency is capped at 2, so at most two rows are
ever downloading at once and neither is the emphasis. Had that cap been 20, amber could not have been
both, because a screen full of downloading rows would leave the emphasis with nothing to stand out from.
It measures 8.30:1 on `--bg` and 6.98:1 on `--surface-raised`, and a filled badge puts `--bg` on it at the
same 8.30:1. Three rules hold it together: one emphasis per view, or the emphasis is the background;
always with a word, never the colour alone; and never on a hover. Amber on a notice's rule and its mark is
right. Amber on the notice's sentence as well is wrong, because once the body copy is tinted it stops
being the thing being pointed at.

**A busy control is not a disabled one.** A syncing button that greys out the instant it is pressed reads
as a refusal. Busy keeps the variant's own colours and gains a spinner, and the spinner is `currentColor`
so it is legible on any fill without a per-variant colour to keep in step. Under
`prefers-reduced-motion: reduce` the ring stops turning and its cut top comes back, because a frozen ring
with a notch reads as broken; the word is what carries the state.

**The segmented control has no fill on its selected option.** Filling it with `--surface-raised` inside a
`--bg` track measures 1.19:1, and inside the dialog it collapses to 1.00:1 because the track was already
the dialog's own fill, so the selection disappeared exactly where it mattered most. Lifting the fill does
not rescue it either: every dark grey in this palette sits between 1.15:1 and 1.80:1 against these
surfaces, and a grey strong enough to read starts failing the label on it, since `--muted` on `#333941` is
3.70:1 and on `#424951` is 2.90:1. The dark end of this palette has no room for a fill. The selection is
therefore a rule under the option plus a step from `--muted` to `--ink`: a shape and a contrast, so the
state survives greyscale and never depends on judging a shade.

**A text input is the one control with no focus ring.** Its focus is carried by the border, shifting from
`--control-border` to `--accent`. That is a hue shift from a desaturated grey to the accent rather than
only a lightness one, it clears 3:1 on the input's own fill at 5.85:1 against the unfocused 4.07:1, and
the caret is in the field. It is a weaker signal than a 2px offset ring and that is a deliberate trade for
the look, since the alternative is no focus indicator at all, which fails WCAG 2.4.7 outright.

Three smaller rules that fall out of the same reasoning. A checked box is filled with the accent rather
than the ink, because the accent is the colour this system already means "you can act on this", and the
near-black mark on it is 5.85:1. An invalid input does not turn its text red: the text stays ink so it
can be read and corrected, and the red goes on the border and on a message that says what to do about it.
And the scrim is one colour, `--scrim`, rather than a black plus an alpha, because a composable opacity
would let a consumer invent a scrim nobody decided on, and a bare `0.6` cannot be read on its own in the
token file.

For `ShareLevel` the product uses the segmented control, not a radio. Sharing is a permission the owner
sets once and reads back every time they look at the share list, not a form that gets posted and
forgotten, and a segmented control shows both permissions side by side with the consequence spelled out
under each. Radio stays in the system for choices that really are a form submission, and it is drawn in
the specimen so that is a decision rather than an omission.

Touch targets are separate from control size. `--control-height` is 36px, comfortable on a desktop and too
small for a thumb, so anything tappable on mobile sits inside `--control-touch` at 44px. The checkbox row
does this by padding rather than by growing the box, so a control looks the same size on both platforms
and only its target differs.
