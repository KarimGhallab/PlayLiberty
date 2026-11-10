# 16: The add dial stays live during a sync

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The dial's `busy` is now only `bulk.busy`. A single playlist's running sync keeps its card and the Syncing heading, and
the add trigger stays enabled and opens the add sheet. The bulk sync still owns the trigger's spinner and disabled
state through `bulk.busy`.

The gallery suite covers the single-sync case (the trigger is enabled and the add sheet opens) and the bulk case (the
trigger is disabled once the batch starts). The Syncing heading and the per-card state tests are unchanged. The
Maestro `gallery-add` flow was not run because it needs a `SOURCE_URL` and adds a playlist; the component test covers
the single-sync case.
