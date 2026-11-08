# 02: The pinned sort and the wrapping chips

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The detail's controls left the scroll. The sort is drawn on its own line and the six chips take the full width in a
wrapping row instead of riding a sideways rail. The detail mounts that block above the scroll, in a band painted
with the screen's ground, so the identity, the sync band and the rows scroll away beneath it while the sort and the
chips stay under the top inset.

Nothing about the controls' behaviour changed. The sort still opens the three-radio sheet and writes one saved
value, with its refusal notice; the chips still carry the whole-playlist counts, still filter the read through its
state parameter, still name an empty filter and offer Show all; both are disabled while the list is shuffled, and the
sort is disabled for a read collaborator. No copy was added.

The detail test that asserted the sideways rail and its divider became the assertion that the controls sit outside
the scroll while the identity stays inside it, and the run-band test now expects the band under the identity alone.

See [`27-sort-and-filter-the-track-list`](../../specs/27-sort-and-filter-the-track-list.md).
