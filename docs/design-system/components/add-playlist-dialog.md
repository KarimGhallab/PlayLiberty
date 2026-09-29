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

**The working state is a spinner and a changed label, and it costs 40.36px of button.** `Add` becomes
`Adding` and gains a 13px spinner and an 8px gap, so the button goes from **67.43px to 107.79px**. That
is four times the empty state's 10px for the same rule, and the reason is that the cost is
proportional to how much the label changes rather than to the spinner: `Sync now` to `Syncing` loses
two characters, and `Add` to `Adding` gains three on a label of three. A short label is the worst case
for this rule and this is the shortest primary button in the product. It is worth the width, because
the alternative is a label that does not change, which costs a screen reader the only announcement
that the press did anything.

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
