# The counts and the state filter

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

The list read can be narrowed to one track state, its total becomes the filtered total, and the same response
carries how many tracks the whole playlist holds in each of the five states.

## Context

Read the spec's decisions on the filter and the counts. The filter is a query parameter rather than a
client-side narrowing, so the page's total and the paging walk stay honest. The counts never follow the filter,
because the point of a count is what is available to filter to.

## Scope

- The list read takes an optional track state and returns only that state's rows; its total is the filtered
  total. No parameter returns every state.
- The response carries the counts: an unfiltered object keyed by the five file states, over the whole playlist.
- The states are the five file states the row already labels. The `sourceStatus: removed` overlay is not a
  bucket, so a stored-but-removed track counts as stored.

## Out of scope

The web chips and the empty state (ticket `05`), a multi-select filter, a search, and the sort (ticket `01`).

## Blocking edges

Blocked by [`01`](01-the-saved-sort-on-a-playlist.md), which edits the same list read.

## Verification

- `pnpm run test` (the server route tests) and `pnpm run build` pass.
- The route tests prove: the state parameter narrows the page and its total; no parameter returns every state;
  the counts cover the whole playlist and do not follow the filter.
