# 02: The pinned sort and the wrapping chips

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

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

## Verification

- Mobile 423 tests across 47 suites pass.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, the sort led above three wrapped chip rows on `Paradis` at 390 dp.
- One swipe left the identity off screen while the sort and the chips kept their exact bounds.
- The sort opened its sheet with Playlist order, Newest first and Oldest first.

See [`27-sort-and-filter-the-track-list`](../../specs/27-sort-and-filter-the-track-list.md).
