# 02: The boundary and the states hold

**Status:** resolved

## Outcome

Verified with tests and no production change. The route built in ticket 01 resolves access through the same
helper the playlist reads use, so an owner and either collaborator level receive the page and an account with no
share, including one whose share was revoked, gets the same `404`. The view copies `fileStatus`, `sourceStatus`,
`failureReason`, `thumbnailPath` and `durationSeconds` straight from the row, so every state and every null
crosses the wire unchanged, with the two nulls present as keys rather than absent. A failed track's
`failureReason` crosses whole at three hundred characters.

See [`03-read-a-playlist.md`](../../specs/03-read-a-playlist.md).
