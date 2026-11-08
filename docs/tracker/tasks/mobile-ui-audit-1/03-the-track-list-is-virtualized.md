# 03: The track list is virtualized

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The detail's list is a `FlatList`. The identity, the controls, the skeleton, the read failure and the empty bodies are
its header; the append spinner and its retry are its footer. The rows are the data, keyed by track id, with 12 initial
rows and a 7-viewport window, so a 1,000-track fixture mounts fewer than 50 rows.

The landing moved to the list: the first viewability pass reports whether the current row is already on screen, and
when it is not, the list scrolls to the row's index once per open with a 16pt offset. A failed `scrollToIndex` falls
back to an estimated offset and retries. Paging still runs from the scroll handler at the same distance, and the
header still follows the offset.

The tests were rewritten to the list's seam: the landing calls `scrollToIndex` once, a visible current row is left
alone, another playlist's queue does not land, and 1,000 tracks stay bounded.
