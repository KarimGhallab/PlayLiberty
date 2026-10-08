# 14: The playing mark announces "Playing" while paused

**State:** `resolved`
**Category:** `bug`

## Outcome

Done. The equalizer strip takes the queue state and announces it, so a held queue no longer says "Playing".

- `TrackBars` gained a `playing` prop, and its `role="img"` label is now "Playing" while the queue runs and "Paused" while it is held. The label is the state and not the row's presence, because the row is the current track in both states.
- The row passes its `playing` and the header passes its own, so the two surfaces take one rule from one component. The header draws its mark only while the queue plays, so it always reads "Playing"; the row draws its mark for the current track in both states and now reads the state. The strip's animation and its freeze across pause are untouched.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (server 275, web 358). The paused and the playing labels are unit-tested in `TrackRow.test.tsx`; the header's existing mark test still holds. Not committed.
