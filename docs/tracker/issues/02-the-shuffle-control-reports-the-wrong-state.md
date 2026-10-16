# 02: The shuffle control reports pressed on every playlist

**State:** `resolved`
**Category:** `bug`

## Outcome

A row's shuffle reports pressed only while the player is shuffled and the queue belongs to that row's playlist. The playlist header combines `shuffled` with `current` for the pressed state, and the library item passes `current` for the queue's own row, derived from the queue's tracks' `playlistId`.
