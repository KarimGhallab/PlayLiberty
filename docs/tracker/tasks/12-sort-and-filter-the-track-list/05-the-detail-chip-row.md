# The detail's chip row

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

The detail's control row gains a row of chips, each carrying how many tracks the whole playlist holds in that
state. A chip narrows the list and the header's count line to that state, "All" restores both, and a state with
no rows draws a named empty state.

## Context

Read the spec's decisions on the filter and the copy, and the detail design record's list section. The filter is
a view for the visit: it clears when the screen is left, and it never changes what plays.

## Scope

- The chips: "All", then "Stored", "Pending", "Downloading", "Failed" and "Unavailable", all five always drawn
  including a zero, with "All" carrying the playlist's total. One active at a time.
- A chip narrows the list and the header's count line to the filtered total; "All" restores both.
- A state with no rows draws a named empty state with a "Show all" action.
- The chips are disabled while shuffled, and the list draws the shuffled queue's order instead.
- Play and shuffle keep covering every playable track, so a filter changes what is seen and not what plays.
- The detail record's list section is amended to name the control row and the two controls.

## Out of scope

A multi-select filter, a search, saving the filter in the database or the URL, and playing only the filtered
rows.

## Blocking edges

Blocked by [`02`](02-the-detail-sort-control.md), which builds the control row, and
[`04`](04-the-counts-and-the-state-filter.md), which returns the counts and takes the state.

## Verification

- `pnpm run test` (the web component tests) and `pnpm run build` pass.
- The component tests prove: the chips carry the whole-playlist counts; a chip narrows the list and the header's
  count line; "All" restores both; a filter that matches nothing draws the named empty state; the chips are
  disabled while shuffled.
