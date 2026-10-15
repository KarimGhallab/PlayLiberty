# 06: The arranging journey

**Blocked by:** [`03`](03-the-saved-sort-is-the-playback-order.md) and [`05`](05-the-detail-chip-row.md).
**Status:** resolved

## Outcome

Implemented and verified. `e2e/tests/arrange.spec.ts` is the assembled-product journey, three tests against one
seeded playlist: three stored tracks and one that fails to download, so the list holds two states at once.

The seed is the load-bearing part. Associations are made one at a time, the first by sync and the rest through
the add dialog, because a single sync stamps every entry with one instant and a date sort over equal instants
tiebreaks on the playlist's own position, which would make the sort a no-op. Distinct added-at times are what
make the date sort a different order from the playlist's, and the failed track is added last so it is the newest.

The three tests prove the facts that only the assembled product has:

- The saved sort re-orders the list (newest first reverses it), survives a reload, and is the order the
  unshuffled transport walks: the first playable is C, then B, then A, because the failed row cannot be queued.
  Oldest first reverses it, and the playlist's own order is reachable again.
- The chips carry the whole-playlist counts before any press (All 4, Stored 3, Pending 0, Downloading 0,
  Failed 1, Unavailable 0), a chip narrows the list and the header's count line to the filtered total while the
  counts stay the whole playlist's, and a state with no rows draws the named empty state whose action clears it.
- The controls go inert while shuffled, and the list draws the shuffled queue's order: its playable rows are a
  permutation of the stored tracks, led by the one sounding, and the transport walks them in the order drawn.

Two existing journeys needed a selector scoped, because the new control row's chips carry the same words the
track rows do: `curate.spec.ts` matched "Failed" and `live.spec.ts` matched "Downloading" unscoped, and both
became ambiguous once the chips drew. Each now scopes to the row or the track list. This is the one regression
the chips introduced, and it was latent until the full suite ran.

Verification: `pnpm test:e2e` (28 passed), `pnpm run test:e2e:typecheck`, `pnpm run lint` and prettier pass. No
em dashes. Not committed.
