# 04: The delete toast denies the row it is deleting

**State:** `resolved`
**Category:** `bug`

## Outcome

A deferred destructive action marks its target for the whole window, so the screen stops claiming a deletion it is not showing. `PendingAction` carries the subject's `id` and `sameIntent` compares it, so two same-named playlists are two intents and a replacement is detected even when the names collide. `PlaylistHeader` takes `pending`: the row dims to `--opacity-disabled`, carries `aria-busy`, and disables its door, its play, its shuffle and its overflow, and `TrackRow` takes the same signal for its lane and its play layer. A playlist's own delete marks its header and every one of its track rows; Cancel lifts the mark, and a replacement lifts the first target's mark and leaves only the current window's target marked.
