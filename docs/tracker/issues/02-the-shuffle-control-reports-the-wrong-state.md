# 02: The shuffle control reports pressed on every playlist

**State:** resolved
**Category:** `bug`

## Outcome

Done. A row's shuffle reports pressed only while the player is shuffled AND the queue belongs to that row's
playlist.

- The playlist header combines `shuffled` with `current` for the pressed state, so a row the queue does not
  belong to reports unpressed even while the player is shuffled.
- The library item passes `current` for the queue's own row, derived from the queue's tracks' `playlistId`;
  the detail already passed it, so its behavior is unchanged when it is the queue.
- Tests: the header (pressed only with both facts), the library (two rows, shuffling one leaves the other
  unpressed, and a second press turns it off) and the detail (pressed while this playlist is the queue,
  unpressed while the queue is another).
- Recorded: only the queue's playlist reports pressed.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (319 tests), the full unit suite and the
e2e suite (27 tests) all pass. Not committed.
