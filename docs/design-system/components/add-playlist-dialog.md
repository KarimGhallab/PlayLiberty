# Add a playlist

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The dialog the [library](../screens/library.md) hosts, on both clients, and the only one it hosts. One
field, because `CreatePlaylistInputSchema` has one.

**Two arrangements: a 400px centred dialog on web, a full-width sheet on mobile.** Not one centred box
at two widths. A sheet is the platform's own idiom for a short task on a phone and a centred card
fights it, so the two clients get their own idiom over the same scrim and the same one field. The
measurements are **400 by 255.6px** on web and **388.4 by 234.8px** as a sheet, and the sheet is 20.8px
shorter because it has no `--space-6` padding, carrying `--space-4` at its bottom instead.

**The sheet is the same dialog with different corners.** Rounded at the top, square at the bottom,
because a sheet is attached to something and a centred card is not. The edge is `--control-border`
rather than `--line` on both, since this is the boundary of something a person is acting through
rather than a hairline between rows.

**The copy says nothing is downloaded until a sync, and that is a correction rather than a style
choice.** The first draft of this body read "It syncs once you add it", which the glossary makes
false: a synced playlist is created by pasting a URL and **synced manually in v1**. There is no
automatic trigger, so a sentence promising one is a promise the product does not keep. The body now
says what a person is about to do and what they will have afterwards, which is true on both counts.

**The invalid message names the host rather than the syntax.** The only place in the product a URL is
refused is here, and the commonest wrong answer is a perfectly good URL from the wrong site, so
"That is not a YouTube link. Paste one from youtube.com." says more than "invalid URL". The red goes
on the border and on that message and **not** on the text, which stays `--ink` so it is still readable
while being corrected. The message is one line at 390 and the dialog grows **24.2px** to take it: a
16.2px line and one `--space-2` gap.

**The working state is a spinner and a changed label, and it costs 43.36px of button.** `Add` becomes
`Adding` and gains a 16px spinner and an 8px gap, so the button goes from **67.43px to 110.79px**. That
is four times the empty state's 11.01px for the same rule, and the reason is that the cost is
proportional to how much the label changes rather than to the spinner: `Sync now` to `Syncing` loses
two characters, and `Add` to `Adding` gains three on a label of three. A short label is the worst case
for this rule and this is the shortest primary button in the product. It is worth the width, because
the alternative is a label that does not change, which costs a screen reader the only announcement
that the press did anything.

**The spinner is the form controls' 16px and this file had to be told.** It said 13px while
[form controls](form-controls.md) said 13px and the
[empty state](empty-state.md) said 16px, and nothing in the tree could see the disagreement, because a
restated value is a second source of truth and three copies of a number that happened to agree were
still three copies. It is 16px because that is `--icon-sm`, the box a mark on a button is drawn in, and a
busy button is the same button with a different mark. This dialog's button carries no mark of its own, so
the spinner is the only thing in it at that size, and it is the size the rest of the system's busy
buttons use.

**The field and the buttons are disabled while it works, and the disabled pair is measured rather than
faded.** The field takes `--control-disabled-bg` and `--control-disabled-fg` and the Cancel button
takes `disabled`, so a second press cannot start a second request. The Cancel being disabled is the
part worth naming: a live Cancel beside a spinner gives somebody a way to leave a request in flight
with no way back to it.

**A modal takes `--z-player` for its own stacking, and that is the one thing in the system that is not
the player bar.** The ordering a modal needs is bar, then scrim, then dialog, and the only level above
`--z-overlay` is `--z-player`, so the dialog takes it and wins against the bar on document order, being
later in the document than the scrim. Four levels still, and no z-index argument. The first draft of
this dialog sat at `--z-base`, which put the scrim on top of the dialog it was dimming: every
measurement of it was correct and a screenshot read as a dialog that had been deliberately dimmed,
which is a thing a designer might have meant. Check `2q` exists for it and was proved by putting the
fault back.

**It fades in and out over `--motion-base`, and the fade carries the arrival rather than decorating
it.** The scrim fades and the card fades while rising from **98% scale** to 100%, so it resolves into
place instead of popping; on close the same distance runs the other way. It is `--motion-base` and not
`--motion-fast`, because this is a state change and not a hover, and `--motion-slow` is the player
bar's and nothing else. The curve is the system's one, `--ease-standard`, on both halves. The exit is a
decision and not a given: a dialog that disappears in one frame reads as a dialog that crashed.

**The two halves are four keyframes and not one keyframe reversed, and that was learned in the
browser.** The first version named one `pl-dialog-fade` and one `pl-dialog-arrive` and set
`animation-direction: reverse` on `data-closing`, on the reasoning that one definition cannot disagree
with itself. It renders as no exit at all: the entrance animation has already finished by the time the
exit starts, and a **finished** animation whose direction changes is re-resolved at its end value
rather than restarted, so the opacity sits at 1 for the whole exit and the node is torn down still
fully opaque. Changing `animation-name` is what starts a fresh animation, so the exit owns
`pl-dialog-fade-out` and `pl-dialog-arrive-out`, and the mirrored pair sits beside the `-in` pair so a
reader sees the reversal. It is the one place in this dialog where the CSS cannot do the obvious thing.

**The unmount waits on the duration, not on `animationend`.** React has no animation library (ADR
0005), so the node has to outlive the open state for the exit to be visible, and the component owns
that lived span. It ends the exit on a timer at the same `--motion-base` and hands that duration to
the stylesheet as `--dialog-motion`, so the animation and the unmount share one number rather than
naming it twice. A component that unmounted only on `animationend` would strand itself over the page
wherever the event does not come, which is any environment that suppresses the animation and any test
runner that does not composite. A reader with `prefers-reduced-motion` set waits for nothing: the
base stylesheet drops the animation and the component closes in the same turn, so there is no
invisible node left behind the state change.

## The input has no focus ring, and that is the form controls record's rule

The border is the focus indicator, shifting from `--control-border` to `--accent`, which clears 3:1 on
the input's own fill at 5.85:1 against the unfocused 4.07:1. It is a weaker signal than a 2px offset
ring and the record calls it a deliberate trade for the look; the alternative was no focus indicator
at all, which would fail WCAG 2.4.7.

## Not this

A second field. A playlist title, which would mean the person can rename a thing that has taken its
name from YouTube, and `PATCH /playlists/:id` is a `sendNotImplemented` stub, so there would be nothing
to rename it with. A preview of what would be added, which needs a route that resolves a playlist's
contents and does not exist. A validation on blur that reaches the network, which needs an API the
project has not specified.

`POST /playlists` is a `sendNotImplemented` stub, so every drawing here is of a route that does not
answer yet. That is a fact about the server and not about this component.
