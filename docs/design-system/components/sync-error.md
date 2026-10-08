# The sync error

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The one surface where a fault and a reassurance have to share a sentence, because a sync never deletes
anything and the user is the one who was told their music could disappear. What went wrong, what was not
lost, and the one action that can help.

**A band: a 2px `--tone-failed` rule on the leading edge, `--surface`, and 12px of padding.** Not a card
and not a border on all four sides: the rule is enough to say this block is a state, and a box around it
would say it is an object, which is a different claim. The band is a flex column with the 12px gap
restated inside it, so the rhythm within the band is the same 12px as the rhythm outside it. Measured on
the nine-line diagnostic at 390, the band alone is 144px, the diagnostic alone 279px, and both together
303px, so the band costs **24px** over the frameless version, which is exactly its own vertical padding
read from its computed style. The rule is on the inline edge, so it costs width and not height, which is
why the figure is 24 and not 26.

**The reassurance is its own line, in `--muted`, and it is the reason this is a component.** A failed sync
on a playlist with 128 tracks is a failure the user did not suffer, and a surface that reports it without
saying so has reported the wrong thing. It is muted and one step down because it is the answer to the
fault rather than part of it: printing the settling in the alarm colour would make the good news as loud
as the bad. It is **absent when there are no tracks**, because "your tracks are safe" about an empty
store is a promise about nothing.

**The retry is the accent button in every case.** The play is transport and is always present; the retry
is state repair and is present only while a fault exists, so the two are never peers. They do not share a
row, and they do not share a size: the play is 48px in the header and the retry is 36px in the band,
about 100px apart in different containers. The accent fill on the retry is therefore the same
deliberation as the accent fill on the play, and not a second emphasis fighting it.

**A retry is offered only where retrying can work, so the deleted-source case has none.** The track row
settled the principle and this follows it: a source playlist that is gone now will be gone in two
minutes, so a button there is a mis-hit the user cannot explain. Nothing in the contract says which
failures are worth retrying, so a client cannot derive it, and whether a button is honest beside a given
fault is a server question.

**The cap on the raw block is the only reason the fourth case is drawable at all.** `SyncRun.error` is a
non-null string with no length bound and the realistic case is a multi-line adapter diagnostic. The box is
capped at 120px with its own scroll; in the drawing its content wants 283px, and uncapped the component
measures **483px** against 303px capped, which is **1 row of list instead of 4**. `pre-wrap` is what makes
the reveal worth having: collapsed to one paragraph, a nine-line traceback stops reading as a traceback.

**The header carries the state and the time and nothing else.** A fault sentence under the track count
would put the same news on screen twice, forty pixels apart, with two different lengths and two different
amounts of reassurance. So the header holds the state and the time, and the three-way split above holds
from all three ends. What the header gives up is the ability to explain a fault on its own, which is worth
it because the explanation is longer than a sentence and because a user with 128 tracks and a user with
none need to be told different things.

**No timestamp.** The two surfaces either side of this one each carry a time and they are different times:
the header shows `PlaylistSchema.lastSyncedAt` and the summary shows `SyncRun.finishedAt`. A third would
say the same thing a third time for one event.

**At 390:** 114px, 180px, 135px and 303px, which is 7, 6, 7 and 4 rows of a 65px track list out of the
610px of content area a phone has between a 136px header and a 98px bar.
