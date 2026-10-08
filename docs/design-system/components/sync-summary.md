# The sync summary

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The outcome of the last run: what was added, kept, removed and failed, and when it stopped. Every field
is on `SyncRunSchema`, a different record with a different lifetime from the playlist, which is why it is
a component of its own and not three more lines on the header.

**A row of four equal cells, each a figure over its own word, both centred.** The cells are 78px at 390,
which is what forces a wording: "gone from the source", the phrasing the track row already uses, is two
lines in that cell where "removed" is one, so the band has to choose between a label that reads as a
deletion and four figures that stop sharing a baseline. It says "removed". That is the one place this
component says something less useful than the track row already says, and it is the price of four equal
columns.

**The figures are quiet by default, and colour is spent only on a count that is not zero.** A "0 failed"
in the fault tone is a red alarm about nothing, and a "0 added" in the accent is a green tick for a
playlist that gained nothing. On a run that changed nothing the entire row is quiet, which is the one case
where the row needs no reading at all.

**The order is a scale of concern rather than a palette, and it runs left to right:** kept quiet, added in
`--accent`, removed in `--emphasis`, failed in `--tone-failed`. A standing total is the background, a new
track is good news, a track that left the source is worth knowing about and is not a problem, and a failed
download is the one thing here that wants a decision.

**Kept is the quietest figure, and its position is the head of an ordered row rather than a colour.** Kept
is the only figure here describing a standing total rather than something that happened, and a tone spent
on a fact that did not change is a tone the eye stops trusting on an event. The price: `--muted` is
5.71:1 and the word under that figure is the same token at the same value, so in the kept cell alone the
figure and its label are told apart by size and weight and by nothing else.

**Three saturated figures in one row, and the row is still legal.** All four pairings clear AA on
`--surface`: kept **5.71:1**, added **5.40:1**, removed **7.66:1**, failed **5.20:1**, the tightest being
the failed figure. Between themselves they do not separate. `--accent` `#2f9e7e` against `--tone-failed`
`#e0625e` is **1.04:1**, a 4.4% luminance gap, so in greyscale those two are the same grey and 161
degrees of hue carry all of it. That is the collision the token set already warns about when it keeps the
accent out of the fault vocabulary, and this row is where that warning gets spent. The two hexes are named
so the figure can be recomputed, because a number in this document that no reader can check is a number
nobody should act on.

Under a red-green dichromacy simulation the accent figure's contrast against the surface falls to about
**3.2**, below the 4.5:1 AA threshold, because a mid-luminance green loses its margin on a dark ground for
exactly the readers who most need the row legible, and amber and red converge on one hue. That figure is
written without the ratio notation on purpose: it is the output of a simulation and not a pairing the
token set produces, so a reader cannot recompute it from `tokens.css` and it must not sit here looking
like something they can. The contrast figures above can, and the two are kept visibly apart rather than
blurred together.

None of it is fixable inside this component, and all of it is why the words are not decoration. Remove the
three colours and the row still says everything.

**Two different times, and they are not a duplication.** The stamp is `SyncRun.finishedAt`, which is when
a run stopped, and the header's is `PlaylistSchema.lastSyncedAt`, which is when a run last completed. A
failed run therefore stamps a time the header does not show, and a successful one stamps roughly the time
the header already shows.

**The error sentence is not drawn here.** The [sync error](sync-error.md) renders it, with the
reassurance about what was not lost and the retry beside it, and printing it here as well would put the
same news on screen twice with two different amounts of reassurance. So the split is three ways and is
stated from all three ends: the playlist header owns the state and the time, this owns the counts, and
the sync error owns the words and the action.

**The in-flight figure is derived, and says so.** There is no stored pending count anywhere in the
contract, so while a run is active the downloading figure comes from the tracks the client already holds,
and the surface states that rather than presenting a number the server never reported. That is the only
case that adds a second line: **66px** for a completed run whether it changed anything, failed, or did
both, and **91px** while one is active, which is 8 rows of a 65px track list at rest and 7 while a sync is
running, out of the 610px of content area a phone has between a 136px header and a 98px bar.

**That 65px was quoted by three records and produced by none of them until
[`17-design-the-playlist-detail`](../../tracker/tasks/17-design-the-playlist-detail.md) fixed a class
name collision.** The playlist header's `.body` rule, in the shared stylesheet, was landing on the
track row's `.body` and gave every row a 96px `min-height` inside a 40px tile, so a row measured
**120.8px**. The rule is now scoped to `.hdr > .body` and a row is **64.8px**, which is 64 plus the
0.8px this environment renders a 1px border at. The figure above is unchanged and is now true; the
arithmetic on it was being done against a row that was not being drawn. The write-up is
[here](../screens/playlist-detail.md#what-composing-these-cost-and-the-two-faults-it-found).

**Not drawn:** a playlist in `PlaylistSyncStatus.Error` with no run to summarise, which is reachable
because the playlist status and the run row are independent, and is a fault with no figures rather than a
summary with no figures. It belongs to the sync error.

The data source exists. `GET /api/v1/playlists/:id/sync-runs/latest`, added in
[`14-expose-the-last-sync-run`](../../tracker/tasks/14-expose-the-last-sync-run.md), returns one run and
distinguishes "no run at all" from "a run that failed" by problem code at one status, so a client can
tell the empty state from a fault. A playlist the account cannot see answers `404` with the same status
as a playlist that does not exist, so this component never has to decide whether it is rendering a
playlist that was unshared.
