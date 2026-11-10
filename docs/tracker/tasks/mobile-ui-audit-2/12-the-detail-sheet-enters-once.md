# 12: The detail sheet enters once

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The route owns the entry and the exit. The detail screen slides in on the stack's `slide_from_bottom`, and the
component no longer starts `sheetY` at the window height or runs its own entry timing. The pull still moves `sheetY`
and lifts the scrim; a shorter pull springs back and a longer one pops the route. Reduced motion sets the route
animation to `none`, so the entry and the exit cut.

A screen recording of opening a playlist shows one continuous slide of the sheet and its scrim. The sheet's own offset
is 0 at rest and only the drag moves it.
