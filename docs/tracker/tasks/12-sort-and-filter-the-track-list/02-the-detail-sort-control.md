# The detail's sort control

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

The playlist detail gains one control row above its list, holding a sort control. Choosing the playlist's own
order, newest first or oldest first re-orders the list at once, the choice is saved for the playlist, and it is
the order the list opens in.

## Context

Read the spec, and the detail design record for where the list sits. The control row is new: one row above the
list, scrolling with it, and it is disabled while shuffled, because the sort belongs to the unshuffled list. The
saved value is read by the same route that returns the rows, so there is no sort parameter.

## Scope

- The read carries the saved value, and the control draws it.
- The control row above the list: a segmented control, "Sort by" over "Playlist order", "Newest first" and
  "Oldest first", with the selected option marked by a rule and a contrast step rather than a fill.
- A press saves the value optimistically and re-orders the list; a failure restores the previous value and says
  so. The press invalidates the playlist and the track reads, because the order changed.
- The control is disabled while shuffled. A read collaborator sees the same control disabled, because the value
  is still theirs to read.
- The row scrolls with the list rather than sticking, and scrolls sideways on a narrow screen rather than
  wrapping.
- New copy lives under the detail namespace.

## Out of scope

The queue following the order (ticket `03`), the filter and the counts (tickets `04` and `05`), and any second
sort key.

## Blocking edges

Blocked by [`01`](01-the-saved-sort-on-a-playlist.md), which saves the value and orders the reads by it.

## Verification

- `pnpm run test` (the web component tests) and `pnpm run build` pass.
- The component tests prove: the control draws the saved order; choosing an order saves it and re-orders the
  list; the control is disabled while shuffled; a read collaborator sees it disabled.
