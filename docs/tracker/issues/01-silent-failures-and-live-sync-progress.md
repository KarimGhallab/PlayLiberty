# 01: A failure the screen never explains, and a sync nobody can watch

**State:** resolved
**Category:** `bug` (the silent failure) with an `enhancement` half (live progress)

## Outcome

Resolved by [`28-guard-the-sync-failure-reason`](../tasks/28-guard-the-sync-failure-reason.md). The failure
half was already built and is now guarded: the detail's band is asserted at the component, at the page and
through the journey, so removing the reason fails the suite. The live half shipped under
[`09-keep-the-screens-current`](../specs/09-keep-the-screens-current.md). The library keeps `Sync failed`
plus the link, as the frontier settled.
