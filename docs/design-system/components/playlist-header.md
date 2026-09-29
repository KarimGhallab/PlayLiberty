# The playlist header

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The cover, the name line, the share indicator, the count, the sync line and the actions. One component,
drawn at two arrangements, and this record owns both.

**There are two consumers of this component and that is why its rules live in `specimen.css` rather
than in the header's own file.** The second consumer is [the library](../screens/library.md), whose
playlist items are this component rather than a smaller thing that resembles it: a gallery of headers.
The rules moved because two copies that are allowed to disagree will, and they did. The library's
first version of an item drew its own cover, its own name line, its own count and its own share
indicator under five class names of its own, and it reproduced `flex: 1` on the name, which is the
fault `.name__text` below documents. Nothing caught it, because a decision that exists only as a
comment inside one stylesheet cannot be inherited by a second consumer.

So what lives where is:

- **`specimen.css`**, beside the equalizer strip, which is the other jointly-owned block: every rule
  of both arrangements, with the morph's emitted block excepted.
- **The header specimen**, which keeps the two numbers that make its own cover, the morph's block
  because `splice-morph-block.mjs` writes it into every file declaring a morph, and its own phone,
  fold and cases.
- **[The transport](header-transport.md)** owns the steps' reasoning, and
  **[the sync summary](sync-summary.md)** owns the state words and the counts of a run. This record
  says where they sit in the block and what the block costs them; it does not restate them.

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

**Six things differ at the library's width, and all six are that screen's decisions rather than this
component's.** They are declared in [the library record](../screens/library.md) and not here, and
`specimen.css` carries none of them, because a card in a column is not this record's card:

1. **No overflow.** Rename, delete, managing shares and syncing on demand are all available from
   inside the playlist on a phone.
2. **The name drops to `--text-lg` 20px**, which reverses the decision recorded immediately below.
3. **The sync line joins the count on one line and the time is left off**, with the count at the left
   and the state at the right, no separator between them, and the count's unit word kept. It wraps to a
   line of its own when the two will not fit, so a card is 223.6px or 247.3px.
4. **No transport.** The card's band holds one control and it is this record's own play, which
   becomes its own pause when that playlist is the one playing. Nothing on the card moves when it
   starts: the band keeps its 16px padding and the play stays where it was.
5. **The shuffle moves to the top left of the picture**, inset 24px, `--space-6`, so the chip and the
   play share a **centre** rather than a left edge: they are a 32px box and a 48px box, and matching
   their left edges puts their centres 8px apart. It was inset 4.2px on the right to sit flush with the
   transport's right edge, so the derivation it rested on went away with the transport.
6. **The name row is `space-between`**, so the share indicator is at the row's right edge. This
   reverses the decision this record makes about the indicator, and the section below that argues
   against it says so in place and scopes it to the row.

**What the fifth is for is the sixth thing on the card, which is a consequence worth stating.** A
playing card now differs from a resting one by a glyph, a label and an accent colour, and by nothing
else: no padding change, no control moving, and no strip, because a card has nowhere to put one. On
this record's own row the strip is what says which item is playing without a press, and
[the transport](header-transport.md) appears over it. On a card at 172.2px neither is drawn, so
**the pause glyph is the entire signal of what is playing**, and it is 48px of button on a shelf of
six. That is the price of the grid, and it is recorded rather than answered.

**A sixth difference, and it is this record's own name-line decision being reversed.** The card's name
row is `justify-content: space-between`, so the share indicator sits at the row's right edge. The
reason above argues against exactly that, and the argument is scoped to the row in the section it is
made, because on a card it was measured and the cost is nil.

**The third of those is the only one that touches this record's own claim, and it is worth stating
plainly: the sync line is still a line of three facts, and at 140.2px a screen may pair two of them
and drop the third.** The header's own argument is that the block gives up the ability to explain a
fault, because that sentence is [a component in its own right](sync-error.md). Pairing the state with
the count gives up the time instead, which is a different loss and a smaller one: `128 · Up to date`
says the same thing about whether to act as `Up to date · Synced 2 days ago · 128 tracks` and it fits.
What the arrangement may not do is invent a fourth fact or shorten a state word, so the words stay the
three this record owns.

**The row is 136px and every row after the first is 137px**, the extra pixel being the row
arrangement's own `border-top` between two of them. What responds to state is the actions column and
not the height: at rest the column is 72px and while playing it is 136px, because the transport
appears in it, so the name gives up 64px and goes from 848px to 784px. The measured computed
`border-top` came back as 0.8px rather than 1px in the environment these figures were taken in; the
declared value is 1px and 137 is the design figure.

**The name is `--text-xl` at both widths this record declares, and that is a decision, not an
omission.** Dropping to a smaller size on the card would mean re-deciding how much of a long name
survives, which is a bigger change than adding an arrangement. What does change is what the name
competes with: beside a 96px cover it is one of three things in a line, and under a square one it is
the first line of the card.

**The library reverses this for its own grid, and the reason it may is the reason given above.** The
argument against dropping the size was that it re-decides how much of a long name survives, which is a
bigger change than adding an arrangement. [The library](../screens/library.md) then put the card in a
**two-column grid**, and at 172.2px the name row is 140.2px, of which the share indicator takes 20px
and the row's own `--space-2` gap takes 8px. That is **112.2px** of text, so `--text-xl` shows eight
characters of a name and `--text-lg` shows ten. The
step is two characters for free and it is declared by the screen rather than by this record, so a card
in a column at full width still gets `--text-xl`. Two characters is not much, and the record says so
rather than calling it a fix.

**At 24px the name truncates on web, which it did not when the library's items were 16px.** The
column is 848px resting and 784px playing, so 64 and 60 characters fit; the library's 78-character
probe is 923px and is cut on both.

**The card is drawn at two widths now, and the narrower one is in a grid.** This record's own card
measures 468.8px with a 356.4px cover because it is the only thing on its screen and it is full-bleed.
[The library](../screens/library.md) draws the same card at **172.2px with a 140.2px square cover**, in
a two-column grid inside its own `--space-4` gutter. Same component, and each screen states the width
it drew it at. The cover needs no second size at either count, because `.mart` is `aspect-ratio: 1`
and square by construction rather than by a number.

**At 172.2px the three controls do not fit on the picture, and that is arithmetic rather than
taste.** The cover is 140.2px and 108.2px of that is inside the band's own 16px padding, while the
play, the shuffle and the overflow together need 168px. The failure is not graceful: the overflow sits
past the right edge of the picture and is clipped by it, and on the one card that is playing the
transport and the action row need 256px, which overruns the card by 85px and lands on its neighbour.
An intermediate version of the library kept the play and the shuffle in the band, which are 104px of
108.2px, and put the overflow on the surface below. That version is superseded twice over: the library's
card carries no overflow at all and no transport, and its shuffle is a chip on the picture's top left,
so the band holds one control in both states and the picture's two controls share a centre line.

**The scrim survives the narrower card and now covers 57.1% of a 140.2px cover**, against 24.7% of the
324.4px cover one card per row gave it. That is the cost of leading with the artwork in a grid and it
contradicts this record's own argument that a band has to be short enough not to eat the artwork. It is
recorded as a cost rather than answered, because the grid is worth more than the band.

**A three-up card grid was measured and is not available.** At 111.33px the card's content needs 154px,
the action row is 76px against a 47.33px cover content box, and the 80px control band would be 100.9%
of a 79.33px cover: taller than the picture it sits on.

**`--mactions` is a fixed 80px, and that is what makes a small card expensive rather than merely
cramped.** The control row does not get shorter with the cover, so every point the cover loses is a
point the band gains. At 356.4px the band is 22.4% of the picture; at 324.4px it is 24.7%; at 140.2px
it is 57.1%. A band's share of a picture is the one figure in this component that gets worse as the
component gets smaller, and it is worth knowing that before choosing a size rather than after.

## The cover is a parameter, and one question is still open

**The cover's size and radius are custom properties and the shared rule reads them**, so a consumer
states two numbers and inherits the geometry, the clipping and the position. The defaults live in the
`var()` fallbacks rather than in a declaration above, which is the one mechanism check 5 sanctions for
a local property and which also means a consumer that forgets one gets a working cover rather than a
0 by 0 one. Check `2r` exists because of this arrangement: a name that does not match leaves every
consumer on the fallback with the run green.

**The two consumers are the same size now, so the earlier radius conflict is retired by the reuse
rather than settled.** The library's item was 64px at `--radius-artwork` while the header drew 96px
at `--radius-card`, and that disagreement was recorded as an open question against
[space and shape](../space-and-shape.md): it gives `--radius-artwork` to album art, "square and barely
softened so a grid of covers reads as one surface", and a playlist cover is album art. At one size
there is one box, and it is the header's. The question is not answered, it is narrower: whether a
96px playlist cover takes the artwork radius or the card radius is still open, and it is now one
decision about one box rather than two decisions about two.

**The hatch is a number and not a derivation, and the reason is that a rule fitted to two cases would
be broken by the third.** The track row's 40px thumbnail uses 5px and this cover 12px, which is
exactly the edge divided by eight, so four stripes cross the box either way. The header's own mobile
card at 356px does not scale with its size and carries 12px, so about fifteen stripes rather than
four. A rule claiming otherwise would be a rule that case breaks. The number sits on `.no-art` rather
than on `.cover`, because the hatch is the texture's period and a cover that has a cover has no
texture.

**The strip is on the row and not on the card, and neither is about the arithmetic.** The strip solves
`7n - 4` against the artwork's content box: 40px gives 6 bars, 96px gives 14, both exact, and check
`2l` re-derives it on every run. The card's square cover gives 51.4 and its own reach of 178px is
behind the 80px of controls it would have to cross, which is the equalizer's recorded reason that a
comb at that size is a texture. The row at 96px can carry one, and does, on the one item that is
playing.

**Only one row ever carries it, and the earlier reason for that was wrong.** The library's record
previously said a strip was withheld because "a track belongs to every playlist that references it,
so three rows of one person's shelf could animate for a single track". Playback is per client and
`data-state` is a single value, so exactly one playlist is the playing one and at most one row shows a
strip. The reasoning was wrong and the outcome was the same, which is the reason it is corrected here
rather than quietly dropped. The strip is also the only thing on the screen that says which playlist
is playing now that every item has a play button, which strengthens the case for it rather than
weakening it.

## The name line, and why the indicator is on it

**The name line is a row and the name inside it is what truncates.** An indicator has to be a fixed
box beside an unbounded string, and the only arrangement in which that holds is a row whose second
item cannot shrink. A convention applied per card is a card that eventually omits it, and its
indicator is truncated away with the name, silently, because a name with no room left and a name with
an ellipsis look the same. The library's first list omitted it from one row, which is that fault
arriving.

**The name is `flex: 0 1 auto` and the indicator holds its 20px.** A growing text element takes every
pixel the row has and pushes the indicator to the far edge, which is a different design: the indicator
stops being attached to the name and becomes a second thing aligned with the cover. `0 1 auto` keeps
the text at the width it needs, lets it shrink when there is not that much, and the indicator holds
its 20px because it cannot shrink either. The library's first item had `flex: 1` and reproduced
exactly this fault.

**A card at 172.2px does the thing this paragraph argues against, and the reason does not transfer.**
[The library](../screens/library.md) sets `justify-content: space-between` on the card's name row, so
the indicator sits at the row's right edge and every card's indicator lines up on one x. That is the
arrangement ruled out above, and it was asked for on the grid's grounds: the card's status line puts
the count at the left and the state at the right, so both rows of a card should terminate on the same
edge. What was measured before doing it: the cost is **nil**. The name's column is 112.2px either way,
because the indicator is 20px and the row's own 8px gap are the same whichever arrangement is used;
**four of the library's six fixtures are cut with the indicator at the far edge exactly as four are cut
with it beside the text**; and the fault this paragraph predicts, an indicator truncated away with the
name, cannot happen on a card either, because `.share` is `flex-shrink: 0` and holds its 20px. On the
row, where the name is 848px wide and there is no second row to align with, the indicator still belongs
beside the text.

**The indicator is coarser than the permission model, and that coarseness is now visible on a shelf.**
One glyph covers both collaborator levels, so the icon says you are not the owner and nothing about
what you may do. On the library that matters more than it does on a single header, because a shelf
puts rows a person may rename next to rows they may not, and the indicator cannot tell them apart. The
overflow can, and does: `access` is on every playlist and the menu is gated on it, so the difference
is invisible until the menu is open and then it is exact. The level is shown where it acts.

## The tooltip reveals on hover here, and the library inherits that

`display: none` at rest rather than `opacity: 0`, because a transparent panel is still in the
accessibility tree and still takes hit tests. The panel is a child of the indicator it labels, so
hovering the panel keeps the indicator hovered, which is WCAG 1.4.13's hoverable requirement satisfied
structurally rather than by a delay. It carries `role="presentation"` and repeats the indicator's
accessible name rather than adding to it.

**The earlier decision to hide it on a library item is withdrawn.** The reasoning was that forty
hover targets is worse than one and that the tooltip never appears on touch anyway. Both halves are
true and the conclusion was wrong: the tooltip is not the consuming screen's decision to make, it is
the same panel saying the same words about the same three states, and a component whose markup
differs from the component it is a size of is how the cover drifted in the first place. It reveals on
hover here, as it does on the header.

**The gap the header already records is inherited, not solved.** This block cannot answer Escape,
which 1.4.13 also requires and which is the client's job, and on a card none of it fires because
there is no hover. A sighted person on a touch device is looking at an unexplained padlock, and the
accessible name is what they do not get.

**The three glyphs do not have equal ink, and the earlier reading of that was wrong.** Measured as a
share of the 24 unit grid they are 24.39%, 25.83% and 19.29%, so the family spreads 6.54 points.
Measured against the pin rather than against each other the argument mostly collapses: the twenty
pinned glyphs run 5.43% to 28.43%, a spread of 23.00, and `user-share` at 19.29% sits just under the
pin's 20.24% mean, while `lock-share` is the third heaviest glyph in the system and `lock` the
fourth. The states meaning "you hold the keys" draw more ink than anything else on the page. It
cannot be fixed here: ADR 0010 allows one weight across the set, so evening these three out would
mean a per-glyph stroke width and two clients agreeing on it. A client drawing this where
collaborators are common is choosing the lighter mark on purpose, and should know the lighter mark is
the average one.

`--muted` for all three states, which is a decision. A tone is how a thing is: idle, failed,
unavailable, and this system already spends tones on those. None of the three share states is better
or worse than another, and ADR 0010's rule is that an icon can never be the most saturated thing on
screen.

## The sync line, and one contradiction inside the header

The line is a dot and a word, then a separator, then the time: `Up to date` / `Syncing` /
`Sync failed`, and `Synced 2 days ago` / `Synced yesterday` / `Never synced`. The word is what
survives when the motion does not and the dot is what survives when the colour cannot be seen, so
neither is carrying the state alone. The words and what a run's counts mean belong to
[the sync summary](sync-summary.md); what this block gives up is the ability to explain a fault,
because that sentence is [a component in its own right](sync-error.md) with its own reassurance and
its own action, and drawing a one-line version here would put the same news on one screen twice.

**One thing about this block is not carried by either element, and it is worth naming because a
consumer has to put it back.** `.state` inherits `--text-xs` from `.meta`. The library's grid pairs
the state with the count on a line that has no `.meta` in it, so the state rendered at the card body's
`--text-sm`: measured 83.6px for "Sync failed" against this record's own 73.8px, a 9.8px penalty on a
140.2px column. The consumer's fix is a `font-size` on its own line, not a change here, because every
other arrangement gets the size from `.meta` correctly. It is recorded as a fault in
[the library](../screens/library.md) rather than as a gap in this block, since a block that is always
drawn inside `.meta` has nothing wrong with it.

**The header contradicts itself about a count of zero, and the library follows the drawing.** One
state's comment says "No count, because no tracks have been fetched, and a playlist with 128 tracks
that has not loaded yet does not have zero tracks." The file's own longer argument says the opposite
and says the correction was made there rather than in a ticket: `trackCount` is a stored integer, a
stored one is never unknown, so the count is drawn even before the tracks are and "0 is an answer
rather than a placeholder". The markup omits it, so the markup is the drawing and the shorter comment
is the stale one. Resolving it is a change to the header, not to a screen, and it is named here
rather than settled by a consumer.

**The count is muted, and that is a decision rather than a default.** The first pass put the figure in
`--ink` at medium weight, which made it the second-brightest thing in the block, brighter than the
sync state, so a playlist with 128 tracks shouted its size over the one fact that mattered, which is
that the playlist is broken. Size says "this is a figure"; colour is reserved for state, and a count
is not a state.

**The count is a total of associations and is not a promise that the playlist will play.** A playlist
of 300 with 290 tracks still `pending` reads 300 and plays four songs. Nothing in this block says
"ready", which is the whole of the available vocabulary for not saying it.

## The actions, and what the library adds to them

Play is the only door, so it is the only large control, and shuffle and the overflow sit beneath it
because they are not doors. The transport appears only while something is playing and is absent rather
than disabled when nothing is, because a paused playlist has no previous and no next to go to.
[That record](header-transport.md) owns the steps, their targets and the width each arrangement costs
the title.

**The overflow holds four items and `access` decides which of them exist.** Share, Rename, Sync now,
and Delete playlist, with a rule before the one that destroys it. The glossary is authoritative and it
is not a close call: a Collaborator "may add a track, remove a track and sync. They may not rename,
delete, or manage shares: those three stay with the owner." So an owner's overflow holds all four, a
`write` collaborator's holds Sync now alone, and a `read` collaborator's holds nothing at all, which
means no overflow button rather than an empty panel. The panel is present only when it is open, which
is the opposite of the tooltip's arrangement and is right for both: a tooltip labels something already
on screen, a menu is not there until it is asked for.

**A shelf puts forty shuffle toggles on one screen, and that is the price of reusing the component
exactly.** Shuffle is a property of playback rather than of a playlist, so forty `aria-pressed`
toggles for one player's shuffle is more state than the screen needs. Dropping it from the item and
keeping it on the player bar and the detail screen's header was the alternative, and it lost because
the item is otherwise identical to the header and one exception is easier to notice than forty
controls. The cost is named rather than hidden.

**The card's menu opens upward and the row's opens downward, and that is the only arrangement
difference with a layout consequence worth stating.** On the card the control is at the foot of the
artwork and a menu opening upward is inside the artwork by a long way, so nothing clips it and nothing
overlaps a control. On the row it opens below the item, which is 170px of panel against a 137px item,
so two open at once in a list would overlap. In the product opening one closes the others, so that is
a property of the specimen and not of the component, and it is why the library draws its three
access levels on cards.

## Every text pairing here is one the token set already declares

The name is `--ink`; the count and the time are `--muted` at 5.71:1 on `--surface` and 6.18:1 on
`--bg`, which is where a library's items sit rather than on a surface; the focus ring is `--accent` at
4.92:1 on `--surface-raised`. The card's panel brings its own ground rather than borrowing one, so its
contrast does not depend on what is behind it, which is what lets the scrim's last stop be opaque
`--surface-raised` and lets the control boundary and the glyph inside it be computed rather than
hoped for.

## Not in the block

The counts of a run, which are [the sync summary's](sync-summary.md). The explanation of a fault and
its retry, which is [the sync error's](sync-error.md). The steps' own reasoning, which is
[the transport's](header-transport.md), and which is also the reason a card at 172.2px cannot skip a
track at all. And the library's own five differences from this record's card, which are the links on an
item's cover and name, the list the items stack in, the two permission facts above, the paired status
line, and the single control on the picture; those belong to
[the library's record](../screens/library.md) and not here.
