# 04: The delete toast denies the row it is deleting

**State:** resolved
**Category:** `bug`

## Outcome

Done. A deferred destructive action marks its target for the whole window, so the screen stops claiming a
deletion it is not showing.

- `PendingAction` carries the subject's `id` and `sameIntent` compares it, so two same-named playlists are
  two intents and a replacement is detected even when the names collide.
- `PlaylistHeader` takes `pending`: the row dims to `--opacity-disabled`, carries `aria-busy`, and its door
  (the row press and both links), its play, its shuffle and its overflow are disabled. `TrackRow` takes the
  same signal for its lane and its play layer.
- The library passes `pending` from `deferred.pending?.id`; the detail's header and its track rows read the
  playlist id, and a row also reads its own track id. A playlist's own delete therefore marks its header and
  every one of its track rows, because the whole playlist is going. Cancel lifts the mark; a replacement
  lifts the first target's mark and leaves only the current window's target marked.
- Tests: the hook (the id and the same-name replacement), the header and the track row (the mark and the
  disabled controls), and the library and the detail (the mark and the lift on Cancel). The existing
  deferred-delete tests still pass.
- Recorded: the header and the track row carry the pending state.

Verification: `pnpm run lint`, the full unit suite (web 335 tests) and the e2e suite (27 tests) all pass.
`pnpm run build` is blocked only by the
concurrent session's untracked prototype (`src/prototype/library-ambience/`), whose `tsc` error is the sole
one; this change's files compile cleanly. Not committed.
