# The playlist header

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The cover, the name line, the share indicator, the count, the sync line and the actions. One component,
drawn at two arrangements, and this record owns both.

**There are three consumers, which is why its rules live in `specimen.css` rather than in the header's own
file.** The second is [the library](../screens/library.md), whose playlist items are this component rather
than a smaller thing that resembles it. The third is [the playlist
detail](../screens/playlist-detail.md), which uses the row arrangement at 1056 and at 390. The rules moved
because two copies allowed to disagree will, and they did: an item that redrew its own cover, name, count
and indicator under five class names of its own reproduced `flex: 1` on the name, the fault `.name__text`
below documents, because a decision that exists only as a comment in one stylesheet cannot be inherited.

- **`specimen.css`**, beside the equalizer strip, holds every rule of both arrangements except the morph's
  emitted block.
- **The header specimen** keeps its own cover's two numbers, the morph's block, and its own phone, fold and
  cases.
- **[The transport](header-transport.md)** owns the steps' reasoning and **[the sync
  summary](sync-summary.md)** the state words and counts; this record says where they sit and what they cost.

## The two arrangements

|                         | the row, at 1056                     | the card, at 390                           |
| ----------------------- | ------------------------------------ | ------------------------------------------ |
| cover                   | 96px, `--radius-card`                | square, `--radius-card`, `aspect-ratio: 1` |
| name                    | `--text-xl` 24px semibold, tight     | `--text-xl` 24px semibold, tight           |
| count                   | number `--text-sm`, unit `--text-xs` | the same                                   |
| sync line               | under the name, with the count       | under the name, with the count             |
| actions                 | beside the identity block            | on the picture, over a scrim               |
| the transport           | 136px, over the band while playing   | not drawn                                  |
| the block's height      | **136px**, 137 after the first       | **468.8px** full-bleed, 436.8px inset      |
| the cover's radius      | `--radius-card`                      | `--radius-card`                            |
| the hatch with no cover | 12px                                 | 12px                                       |

The row arrangement has a consumer at 390 as well, and the two consumers disagree about one line and one
target. [The playlist detail](../screens/playlist-detail.md) draws the row across the top of a 390 frame
rather than the card, because at 390 the card is **470.4px** and the row is **136px**, which is 275px of
list against 609.4px, four rows against nine. The row's geometry at that width is 96 + 20 + **180.4** + 20 +
72 = 388.4, and 136 tall because the body's content fits inside the cover's 96.

The disagreement is the sync line. At 390 the identity block has **180.4px** and the line needs
**198.16px** (70.78 state, 3.91 separator, 99.47 time, 12.00 of gap either side). `.meta` is `flex-wrap:
nowrap`, so the row does not wrap and the last span wraps inside itself, arriving at 81.71px, taking 32.4px
of height instead of 16.2, and stranding the separator at the end of the line above. So the time goes and the
separator with it, and the line is 70.78px on one line.

Full-bleed at 390 puts 5.2px of the last step's 44px target off the screen. The steps are borderless, so
their target grows outward six pixels a side through a `::before` that paints nothing; on a header at its
container's inline edges with no page inset to absorb it, the target reaches 5.2px past the frame and the
effective target is 38.8px, which still clears WCAG 2.2's 24px minimum. The placement is the detail's
decision and is recorded there; it is named here because the rule assumes an inset somewhere and this
arrangement provides none.

**Six things differ at the library's width, and all six are that screen's decisions declared in [its
record](../screens/library.md), not this component's:** no overflow; the name drops to `--text-lg` 20px; the
sync line joins the count and drops the time, with the count left and the state right and no separator; no
transport, so the card's band holds one control; the shuffle moves to the picture's top left at 24px
(`--space-6`) so the chip and the play share a **centre** rather than a left edge; and the name row is
`space-between`. The last reverses this record's own indicator decision and is scoped to the row below,
because on a card the cost was measured as nil.

**The row is 136px and every row after the first is 137px**, the extra pixel being the row's own
`border-top`. What responds to state is the actions column, not the height: 72px at rest and 136px while
playing, because the transport appears in it, so the name goes from 848px to 784px. The measured
`border-top` came back as 0.8px in this environment; the declared value is 1px and 137 is the design figure.

**The name is `--text-xl` at both widths this record declares.** Dropping to a smaller size on the card
would mean re-deciding how much of a long name survives, which is a bigger change than adding an
arrangement. The library reverses this for its grid, and the reason it may is that reason: at 172.2px the
name row is 140.2px, minus the indicator's 20px and the row's 8px gap, leaving **112.2px** of text, where
`--text-xl` shows eight characters and `--text-lg` shows ten. The step is two characters, declared by the
screen rather than by this record, so a card at full width still gets `--text-xl`. At 24px the name truncates
on web: the column is 848px resting and 784px playing, so 64 and 60 characters fit, and the library's
78-character probe at 923px is cut on both.

**The card is drawn at three widths and only the middle one is in a grid.** This record's own card is
468.8px with a 356.4px cover, full-bleed and alone on its screen. The library draws it at **172.2px with a
140.2px square cover** in a two-column grid, and the detail at **320px with a 288px square cover** as the
left column of a two-column desktop screen. The cover needs no second size at any of the three, because
`.mart` is `aspect-ratio: 1`.

The detail's 320px card declares no difference, and what it costs is two figures this record predicts: the
scrim is **27.8%** of a 288px picture against **24.7%** of a 324.4px one, because the band is a fixed 80px
and gets worse as the picture shrinks, and the name's text column is **260px** after the indicator, **22
characters** against this record's own 25. The card is 400.4px in both states and so is the 286.4px band:
the transport and the action row sit beside each other, which is this record's own swap, because a card with
a play and no steps is a card that cannot skip.

**One of this record's rules was landing on a component it does not belong to.** `.body` is declared here,
bare, for the identity block, and `track-row.html` declares its own `.body` without setting `display`, so
this rule won on the two declarations the row never mentioned and **every track row measured 120.8px rather
than 65px**. It is now `.hdr > .body`, a child combinator that separates the legitimate consumers (direct
children of `.hdr`) from the illegitimate ones (children of `.row`), and all fourteen headers and all nine
library items measure the same before and after.

**The same collision had a second face, on `.state`, and it cost a line.** This record's `.state::before` is
a 7px mark in the state's own tone, while the track row's `.state` is a single coloured word with no mark
and its own 3px `.dot` span. So this rule was landing on every state word in every track row, each **15px**
wider: `Downloading` 86.85px becoming 71.85px, `Failed` 48.31px becoming 33.31px. On a phone the failed
row's sentence, which fitted on one line at 390px, was pushed onto two, taking the row from **76.1px to
92.3px**. The rule is now `.hdr .state, .mhdr .state`, and all nineteen header states and all twenty library
ones keep the mark. **A class name in a shared stylesheet is a claim about every element carrying it, not
about the file that wrote it.**

**At 172.2px the three controls do not fit on the picture.** The cover is 140.2px and 108.2px of that is
inside the band's 16px padding, while the play, shuffle and overflow together need 168px: the overflow is
clipped by the picture, and on a playing card the transport and action row need 256px and overrun the card by
85px. The library's answer (no overflow, no transport, the shuffle on the picture's top left) supersedes the
intermediate version that kept the play and shuffle in the band.

**The scrim survives the narrower card and covers 57.1% of a 140.2px cover**, against 24.7% of the 324.4px
cover one card per row gave it, which contradicts this record's own argument that a band must be short
enough not to eat the artwork. It is recorded as the cost of the grid. A three-up card grid is unavailable by
arithmetic: at 111.33px the content needs 154px, the action row is 76px against a 47.33px cover box, and the
80px band would be 100.9% of a 79.33px cover.

**`--mactions` is a fixed 80px, which makes a small card expensive rather than merely cramped.** The band
does not get shorter with the cover, so every point the cover loses the band gains: 22.4% of a 356.4px
picture, 24.7% of a 324.4px one, 57.1% of a 140.2px. That is the one figure in this component that gets worse
as the component gets smaller, and it is worth knowing before choosing a size.

## The cover is a parameter, and one question is still open

The cover's size and radius are custom properties read by the shared rule, so a consumer states two numbers
and inherits the geometry, clipping and position; the defaults live in the `var()` fallbacks, so a consumer
that forgets one gets a working cover rather than a 0 by 0 one. Check `2r` exists because of this: a name
that does not match leaves every consumer on the fallback with the run green.

The two consumers are the same size now, so the earlier radius conflict is retired by the reuse rather than
settled. The library's item was 64px at `--radius-artwork` while the header drew 96px at `--radius-card`, and
[space and shape](../space-and-shape.md) gives `--radius-artwork` to album art. At one size there is one box,
and it is the header's; whether a 96px playlist cover takes the artwork radius or the card radius is still
open, and is now one decision about one box rather than two about two.

The hatch is a number and not a derivation: the track row's 40px thumbnail uses 5px and this 96px cover 12px,
which is the edge divided by eight, so four stripes cross either way. It sits on `.no-art` rather than
`.cover`, because the hatch is the texture's period and a cover that has a cover has no texture.

The strip is on the row and not the card. It solves `7n - 4` against the artwork's content box: 40px gives 6
bars, 96px gives 14, both exact, and check `2l` re-derives it. The card's square cover gives 51.4, and the
detail's 288px covers gives 34.57, so a comb at those counts is a texture rather than an equalizer; the row
at 96px carries one, on the one item playing. Only one row ever carries it, because playback is per client
and `data-state` is a single value, so at most one playlist is playing. It is also the only thing that says
which playlist is playing now that every item has a play button.

## The name line, and why the indicator is on it

The name line is a row and the name inside it is what truncates: an indicator has to be a fixed box beside
an unbounded string, and the only arrangement in which that holds is a row whose second item cannot shrink.
Applied per card instead, a card eventually omits the indicator and it is truncated away silently, because a
name with no room left and a name with an ellipsis look the same. The library's first list omitted it from
one row, which is that fault arriving.

The name is `flex: 0 1 auto` and the indicator holds its 20px. A growing text element takes every pixel and
pushes the indicator to the far edge, where it stops being attached to the name and becomes a second thing
aligned with the cover. `0 1 auto` keeps the text at the width it needs and lets it shrink; the indicator
holds its 20px because it cannot shrink either.

A card at 172.2px does the thing this argues against, and the reason does not transfer. The library sets
`space-between` on the card's name row so the indicator lines up on one x, on the grid's grounds that the
card's status line terminates on the right and both rows should end on the same edge. Measured before doing
it, the cost is nil: the name's column is 112.2px either way, four of the six fixtures are cut whichever
arrangement is used, and the predicted fault cannot happen because `.share` is `flex-shrink: 0`. On the row,
where the name is 848px wide and there is no second row to align with, the indicator belongs beside the text.

The indicator is coarser than the permission model: one glyph covers both collaborator levels, so it says
you are not the owner and nothing about what you may do. On a gallery that matters more, because a person may
rename one row and not the next, and the indicator cannot tell them apart; the overflow can, and does, so
the level is shown where it acts.

## The tooltip reveals on hover, and the library inherits that

`display: none` at rest rather than `opacity: 0`, because a transparent panel is still in the accessibility
tree and still takes hit tests. The panel is a child of the indicator it labels, so hovering the panel keeps
the indicator hovered, satisfying WCAG 1.4.13's hoverable requirement structurally. It carries
`role="presentation"` and repeats the indicator's accessible name rather than adding to it. The library
reveals it too, because a component whose markup differs from the component it is a size of is how the cover
drifted in the first place. This block cannot answer Escape, which 1.4.13 also requires and which is the
client's job, and on a card none of it fires because there is no hover.

The three glyphs do not have equal ink: measured as a share of the 24 unit grid they are 24.39%, 25.83% and
19.29%, and against the pin's own 5.43% to 28.43% spread the argument collapses, since `user-share` at 19.29%
sits just under the pin's 20.24% mean while `lock-share` is the third heaviest glyph in the system. ADR 0010
allows one weight across the set, so evening them out would mean a per-glyph stroke width and two clients
agreeing on it. A client drawing this where collaborators are common is choosing the lighter mark on
purpose. All three states are `--muted`, because a tone is how a thing is and none of the three share states
is better or worse than another, and ADR 0010's rule is that an icon can never be the most saturated thing
on screen.

## The sync line, and one contradiction inside the header

The line is a dot and a word, a separator, then the time: `Up to date` / `Syncing` / `Sync failed` and
`Synced 2 days ago` / `Synced yesterday` / `Never synced`. The word survives when the motion does not and the
dot survives when the colour cannot be seen. The words and what a run's counts mean belong to [the sync
summary](sync-summary.md); this block gives up the ability to explain a fault, because that sentence is [a
component in its own right](sync-error.md) with its own reassurance and action.

`.state` inherits `--text-xs` from `.meta`, which a consumer has to put back: the library's grid pairs the
state with the count on a line with no `.meta`, so the state rendered at `--text-sm`, 83.6px for "Sync
failed" against this record's 73.8px. The consumer fixes it on its own line rather than here, because every
other arrangement gets the size from `.meta` correctly.

**The header contradicts itself about a count of zero.** One state's comment says "No count, because no
tracks have been fetched", while the file's own longer argument says the opposite: `trackCount` is a stored
integer, a stored one is never unknown, so the count is drawn even before the tracks are and "0 is an answer
rather than a placeholder". The markup omits it, so the markup is the drawing and the shorter comment is
stale; resolving it is a change to the header, not to a screen.

The count is muted, which is a decision: the first pass put it in `--ink` at medium weight and it outshouted
the sync state, so a playlist with 128 tracks shouted its size over the fact that it is broken. Size says
"this is a figure"; colour is reserved for state. The count is a total of associations and not a promise
that the playlist plays: a playlist of 300 with 290 still `pending` reads 300 and plays four songs.

## The actions, and what the library adds to them

Play is the only door, so it is the only large control, and shuffle and the overflow sit beneath it because
they are not doors. The transport appears only while something is playing and is absent rather than disabled
when nothing is, because a paused playlist has no previous and no next to go to. [That
record](header-transport.md) owns the steps, their targets and the width each arrangement costs the title.

The overflow holds four items and `access` decides which exist: Share, Rename, Sync now, Delete playlist,
with a rule before the one that destroys it. The glossary is authoritative: an owner's overflow holds all
four, a `write` collaborator's holds Sync now alone, and a `read` collaborator's holds nothing at all, so no
overflow button rather than an empty panel. The panel is present only when open, the opposite of the
tooltip's arrangement: a tooltip labels something already on screen, a menu is not there until asked for.

A gallery puts forty shuffle toggles on one screen, the price of reusing the component exactly. Shuffle is
playback state rather than playlist state, so forty `aria-pressed` toggles are more state than the screen
needs; dropping it and keeping it on the player bar and the detail header lost because the item is otherwise
identical to the header and one exception is easier to notice than forty controls.

The card's menu opens upward and the row's downward. On the card the control is at the foot of the artwork,
so a menu opening upward is inside the artwork and clips nothing. On the row it opens below the item, 170px
of panel against a 137px item, so two open at once in a list would overlap; in the product opening one closes
the others, which is why the library draws its three access levels on cards.

## Every text pairing here is one the token set already declares

The name is `--ink`; the count and the time are `--muted` at 5.71:1 on `--surface` and 6.18:1 on `--bg`,
which is where a library's items sit rather than on a surface; the focus ring is `--accent` at 4.92:1 on
`--surface-raised`. The card's panel brings its own ground rather than borrowing one, so its contrast does
not depend on what is behind it, which is what lets the scrim's last stop be opaque `--surface-raised`.

## Not in the block

The counts of a run, which are [the sync summary's](sync-summary.md). The explanation of a fault and its
retry, which is [the sync error's](sync-error.md). The steps' own reasoning, which is [the
transport's](header-transport.md). And the library's own differences from this record's card, which belong
to [the library's record](../screens/library.md).
