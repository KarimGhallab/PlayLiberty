# The row's play control

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

It is the header's control. Same class, same accent fill, same `--radius-chip`, same disabled treatment,
same eight-frame morph from the same generator. The strip's CSS block is in both specimens and is
byte-identical, because `styleBlock()` emits the resting-frame rule once per host as a single declaration
with a selector list, and check `2j` compares one string against both copies. Neither can drift from the
generator or from each other.

**Only the size differs, and 28px is forced rather than chosen.** The row is 40px tall, so a 48px control
makes it 56px and every row in every list grows by 16px. The glyph drops from `--icon-lg` to `--icon-sm`
with it, which is 0.58 of the control against the header's 0.58, so the proportion is unchanged and the two
are the same object at two sizes.

**The lane is reserved on every row, whether the control is shown or not.** A control inserted on hover
pushes the duration sideways under the pointer, and a row whose duration jumps while the pointer is on it
is worse than no control. It is paid for out of the title: at 390px the title column goes from 200.4px to
160.4px, exactly 40px for a 28px control and one 12px gap, which is 20 percent of the column. What it does
not change is which rows truncate: on the three rows the phone frame draws, the two short titles fit
either way and the long one is cut either way, so the lane costs slack rather than content.

**It is hidden with `opacity` and not with `visibility`, and that is the whole ballgame.** A
`visibility: hidden` control is out of the tab order, so `:focus-within` can never fire and a keyboard
user tabs straight past a control that appears the moment they reach it. `opacity: 0` leaves it focusable,
which is why tabbing into the row reveals it, and `pointer-events` has to be taken back at the same
moment because an invisible control is still clickable. Check `2o` holds the relationship: a subject
hidden at rest and revealed by `:hover` must also be revealed on focus, comparing the revealed selector
with any `:not()` condition stripped, since a condition on an element is not part of what the element is.

**Where there is no hover it is simply always visible.** `@media (hover: none)` is the whole rule: a touch
device that revealed the control on hover would never reveal it at all. That is also the one place the
accent fill costs something, since a filled accent circle on every tile of a 40px thumbnail is a bright
dot repeated down the list.

**Four of the seven file states have no file to play**, which is downloading, pending, failed and
unavailable. Their control is `disabled` rather than absent, so the lanes still line up, and a disabled
control is not revealed either. Removed is not one of the four: a removed source whose file is stored is
still on disk and still playable, and its state word names the source it left, `Removed from YouTube`, with
the title kept at full ink because the row still plays. The unplayable rows step their title down to the meta
colour so the list reads at a glance; downloading is the exception, because its row already breathes. Check
`2p` holds both halves, that the control is disabled on those rows and present on all of them.

**The cost of one control rather than two is fifteen path elements per button.** Sixteen rows carry 240 of
them and a hundred and twenty eight tracks would carry 1920. The validator reports 315 computed frame
paths across the two specimens, which is the number to watch. A lighter strip drawn once as a background
image would remove the cost entirely, at the price of the per-bar geometry no longer being path data that
a check can read.

The strip is `aria-hidden` in the header and `role="img"` with a label in the track row, and the
difference is forced. The header's play button is a labelled control that already says it will pause, so a
second announcement would be noise. The row's lane is an overflow menu, so nothing else in the row says
anything about playback and a hidden graphic would say nothing at all. The row also carries no
`data-state`, on purpose: the strip's presence is the state, and the header needs the attribute only
because an animation beats a plain declaration, so the morph's resting frame has to be a state rule. An
attribute that carries nothing is chrome.
