# The empty state

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

A playlist that exists, is named, and has no tracks, because `lastSyncedAt` is still null. One action
and three facts, on one axis.

**The action is `Sync now`, and that is the only word for it.** The glossary term is `sync`, the button
label says what the control does, and there is no automatic trigger in v1, so there is nothing for a
second word to be distinguished from. The manual trigger is `POST /playlists/:id/sync`; the route is
named in [`ticket 12`](../../tracker/tasks/12-rename-refresh-route-to-sync.md).

**Three facts, on three lines, so none can be skimmed past as part of another.** Nothing is here because
the playlist has never been synced and not because anything broke. Syncing goes to YouTube and downloads
the audio of every track. And a sync takes a few minutes, but once a track is downloaded it is yours, so
a video removed from YouTube later does not empty the playlist again. The third is the product's whole
promise and an empty state is the one surface where saying it once is not nagging, because there is
nothing yet to lose.

**The words do not change when the action runs.** All three are still true while the sync is running: it
still has never been synced, a sync still goes to YouTube, and a sync still takes a few minutes. The
third is more true than it is at rest. So the only difference between the two drawings is the button, and
the button's busy form is the one `form-controls.html` already defines. That costs the button its width,
measured: **126.81px becomes 115.8px**, and the 11.01px of change is the label alone, because `Syncing` is
two characters shorter than `Sync now`. `form-controls` says a loading button keeps its label so it does
not change width mid-click, and this is that rule and its exception in one control. The alternative is a
label that does not change, which costs a screen reader the only announcement that the state changed at
all.

**The button's two marks are the same box, and that is the whole reason the spinner is 16px rather than
13px.** The resting form carries `rotate-clockwise` at `--icon-sm`, a 16px box, and the busy form swaps it
for the spinner, so the two marks have to be one size or the swap costs the layout something. Measured with
the spinner back at 13px: the press change is **14px** rather than 11px, three of it for no reason a user
can see. And the busy form **drops** the rotate rather than carrying both, because the two are different
verbs: one says _do it again_ and the other says _it is happening_, and a button has one. Proved by putting
the mark back on the busy form: the button is **140px**, 13px wider than the resting one, with two marks
on it.

**The mark is `--icon-sm` and the size is measured rather than read off the scale.** `rotate-clockwise`'s
ink is 18 by 18.06 units of the 24 unit grid, 75% of the box, against the `plus`'s 67%, so it is the
heavier of the system's two button marks and the step below `--icon-md` matters more here than it does
for the plus. At `--icon-sm` its ink is 12.04px against a 10.0px cap height, **1.20 times**; at
`--icon-md` it would be 15.05px, **1.51 times**, where the plus at `--icon-md` is 1.36. The rule is the
[icons record's](../icons.md): a mark beside a `--text-sm` label is a mark _on_ the label, not a peer of
it. Its ink is centred on both axes to 0.00 units, so it takes no optical correction, and the validator's
rule that a centred glyph must not carry one is what asserts that.

**The reading width is 66ch and the number lives in one place.** The sentence is `.prose`, which already
carries it, and it is worth knowing what that is in pixels: 16px of Plex Sans has a 600/1000 tabular
advance, so a ch is 9.6px and 66ch is 634px. No token carries it, and inventing one would put a reading
width in `tokens.css` that no other component needs.

**The centred stack is 204px at 1014 and 285px at 390**, with the action 245px from the top on a phone,
which is 365px inside the 610px of content area between a 136px header and a 98px bar. Two arrangements
fail on a number rather than on taste. A two-zone layout with the action flush left collapses at 390,
because a 36px button with 20px of padding either side plus a 32px gap leaves 206px of a 342px content
box, so the sentence runs six lines at about twenty-one characters, below any reading width the type
section supports: the arrangement that argues straight from the brand commitments is the one that needs a
stacking rule on a phone. And drawing the shape of what will arrive makes its promise only two-thirds
visible, because the 28px and 52px lanes it reserves are transparent with no border, so a reader sees
empty space and cannot see the alignment they encode; what is visible is the 65px row rhythm and the 40px
tile. It is also the tallest thing there, 569px at 390, fitting a phone by 41px, so it is the variant that
leaves nothing for the next thing this product puts on a playlist screen.

Every `<p>` and heading in a component carries `margin: 0`, because a `<p>` has a user-agent margin and a
stack of them measures taller than its own gaps account for by an amount no screenshot reveals.

**Not drawn, and the distinction is the point:** the first sync _failing_. That is
`PlaylistSyncStatus.Error` with a null `lastSyncedAt`, so it is reachable from here, and it is a fault
rather than an absence. This surface says nothing is wrong, and a failed first sync has to say something
is, so these words must not survive into it. It belongs to the
[sync error](sync-error.md). The library
with no playlists at all is a different component with a different action.
