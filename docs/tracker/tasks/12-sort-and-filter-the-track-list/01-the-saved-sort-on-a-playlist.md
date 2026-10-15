# The saved sort on a playlist

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

A playlist remembers an order: its own, newest first, or oldest first. Both reads that return a playlist's
tracks answer in that order, and the value is saved per playlist for an owner or a write collaborator.

## Context

Read `docs/tracker/specs/12-sort-and-filter-the-track-list.md`, and `docs/GLOSSARY.md` for the vocabulary. The
per-playlist setting follows the skip-non-music precedent: a value on the playlist row, changed with write
access, answered by the update route, and republished as a playlist change.

## Scope

- A new nullable value on the playlist row: absent or null means the playlist's own order; the other two are
  newest first and oldest first. A migration adds it.
- The contracts gain the sort enum, and the playlist read carries the value so the client can draw the control.
- The list read and the queue read order by the saved value: the saved sort, then the playlist's own position as
  the tiebreak for equal dates. The sort key is the association's added-at, which stays server-side and is never
  surfaced or drawn.
- The mutation saves the value: it validates its body, requires write access (the owner or a write collaborator;
  a playlist the account cannot see answers `404`, as the other playlist routes do), answers the updated
  playlist, and republishes the playlist change so another client refetches.
- The corpus statement this falsifies is amended: the "sorting by anything but position" out-of-scope line in
  [`03-read-a-playlist`](../../specs/03-read-a-playlist.md) points at the new spec.

## Out of scope

The web control (ticket `02`), the queue adopting the order (ticket `03`), the filter and the counts (ticket
`04`), and any sort key other than the association's added-at.

## Blocking edges

None. Can start immediately.

## Verification

- `pnpm run test` (the server route tests) and `pnpm run build` pass.
- The route tests prove: the playlist's own order with no value saved; newest first and oldest first after each
  value is saved; the position order within one timestamp; the queue read matching the list read; the owner and
  a write collaborator may save, a read collaborator is refused, and a playlist the account cannot see answers
  `404`; an unknown value is a validation failure.
