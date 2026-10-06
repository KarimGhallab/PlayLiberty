# 01: A failure the screen never explains, and a sync nobody can watch

**State:** resolved
**Category:** `bug` (the silent failure) with an `enhancement` half (live progress)

## Disposition

The failure half is built: the detail screen draws the `sync-error` band with the sentence, the
reassurance, the retry and the raw reason, so the bug this ticket reports is closed. The live half shipped
under [`09-keep-the-screens-current`](../specs/09-keep-the-screens-current.md).

What remains is the guard the ticket's Q2 and Q8 ask for, and it is
[`28-guard-the-sync-failure-reason`](../tasks/28-guard-the-sync-failure-reason.md). This issue stays open
until that lands, then resolves with the outcome recorded. The frontier above is settled as recorded in
task 28's Origin section.

## Outcome

Resolved by [`28-guard-the-sync-failure-reason`](../tasks/28-guard-the-sync-failure-reason.md). The failure
half was already built and is now guarded: the detail's band is asserted at the component, at the page and
through the journey, so removing the reason fails the suite. The live half shipped under
[`09-keep-the-screens-current`](../specs/09-keep-the-screens-current.md). The library keeps `Sync failed`
plus the link, as the frontier settled.

## Observed

Pasting `https://www.youtube.com/playlist?list=PLfLj9Fg3h56A` created the playlist and the run failed. The
library drew `Sync failed` and nothing else. The reason existed the whole time, on the run:

```
error: "yt-dlp exited with code 1: ERROR: No suitable extractor found for URL https://www.youtube.com/playlist?list=PLfLj9Fg3h56A"
```

That specific cause is fixed (`--use-extractors youtube` did not match `youtube:tab`; see below). The
issue is not that adapter bug: it is that a failed sync is a dead end on the screen, and that a running
sync shows nothing moving. Either one can hide a broken instance from the person using it.

## Expected

A person whose sync fails learns what happened and what did not happen to their library, on the screen
where it failed. A person whose sync is running can see it running, per playlist and per track, without
reloading. Neither requires the person to read a log or ask the operator.

## Evidence

- The reason is already in the contract and already served: `SyncRun.error` on
  `GET /api/v1/playlists/:id/sync-runs/latest`, and `Track.failureReason` on the tracks route. No route is
  missing; nothing draws them.
- The failure was a status with no words because the library item renders `syncStateLabel` and no reason.
- The design system already specifies both surfaces and neither is built:
  [`sync-error`](../../design-system/components/sync-error.md) draws the fault, the reassurance and the
  retry; [`sync-summary`](../../design-system/components/sync-summary.md) draws the run's counts and says
  the in-flight figure is derived from the tracks the client holds.
- [`09-keep-the-screens-current`](../../tracker/specs/09-keep-the-screens-current.md) already decided the
  refresh loop and story 8 ("the latest run's figures and its error to appear without a reload"). It is
  `ready` and unbuilt, so the live half has an owner.
- The contract has no per-track progress: `TrackSchema` carries `fileStatus` and `failureReason` and no
  bytes or percentage, so "which track is syncing" can only be a state, never a bar.

## What this ticket is

A grilling brief, not a spec. The questions below are the design tree's frontier: the decisions that can
be settled now, before anything downstream. Answer them and the ticket becomes a spec or a set of tickets.
Do not implement from this.

## Frontier questions

❓ **Q1** - **What is the actual class of failure to guard against?** Is this ticket about "a sync error is
invisible", or about the larger class "a server state the screen cannot explain"? The instance was a
status with no reason; the same shape recurs wherever a screen draws a state word and drops the field that
explains it.

➡️ Treat it as the class, and make the guard the deliverable: every user-visible failure state must have a
way to see its cause. Wire the one instance, then state the rule, so the next one is caught by the rule
and not by a person noticing.

❓ **Q2** - **Does guarding against silence need a check, or is it a review rule?** A rule nobody runs is a
preference. The alternative is a test or a gate that fails when a failure status is drawn without its
cause.

➡️ Add a check with teeth, in the shape this repo already uses: a test that renders a failed playlist and
asserts the reason is reachable, so removing the reason fails the suite. Not an ESLint rule, because the
cause and the status live in different layers and a linter cannot see the pairing.

❓ **Q3** - **Where does the failure explain itself: the library, the detail, or both?** The library item
is one line in a list of forty; the detail is where the designed `sync-error` band lives. Drawing the full
band on every failed library item is a wall of text.

➡️ The library says `Sync failed` and links to the playlist, as now; the detail carries the `sync-error`
band with the reason, the reassurance and the retry. One place owns the words, per the `sync-summary`
record's three-way split.

❓ **Q4** - **Is "live which tracks are syncing" per-track state or a transfer bar?** The contract has no
bytes and no percentage, so a bar would need new fields, a new writer and a decision about back-pressure
from yt-dlp.

➡️ Per-track state only: the list shows each track moving `pending` to `downloading` to `stored` or
`failed`, which the contract already carries and spec 09 already refreshes. A progress bar is a separate
decision and probably a non-goal, because it needs a field the product has not chosen to store.

❓ **Q5** - **What does a running sync show that a settled one does not?** The `sync-summary` record says
the in-flight figure is derived from the tracks the client holds, and that it is 91px while active against
66px settled. Is the live view the summary's derived figure, the track list states, or both?

➡️ Both, on the detail: the summary's active figure at the top and the track list below, which is what the
record already draws. The library keeps the single `Syncing` word and no figure.

❓ **Q6** - **Does the live half belong in this ticket or in spec 09?** Spec 09 already owns the refresh
loop and the "latest run without a reload" story, and is ready.

➡️ Split: the live view is spec 09's, with this ticket only deciding what the screens do with the data it
refreshes. Do not duplicate spec 09; reference it and let it carry the loop.

❓ **Q7** - **Do the two halves ship together?** The silent failure is a bug and is cheap; the live view
is a screen and is not.

➡️ Separate. Fix the silence first, on the existing detail screen, so the class is closed; then build the
live view as its own ticket under spec 09. Coupling them delays the cheap half behind the expensive one.

❓ **Q8** - **What is the acceptance test for "not silent" that a machine can run?** Something has to fail
when the reason becomes unreachable again.

➡️ An E2E case: a playlist whose fake source throws, added from the library, then the detail shows the
run's error text. The fake already supports it (`scenarios` can fail a source), so the case is one spec in
`e2e/tests/`, and it currently fails because the detail does not exist. That is the honest red it should
be.

## Fix already landing

`packages/youtube/src/ytdlp.ts` now passes `--use-extractors youtube,youtube:tab` in both
`buildListArgs` and `buildDownloadArgs`, and `ytdlpArgs.test.ts` asserts the exact selector on both, so
the playlist case cannot regress to the single name. Verified: the real `YtdlpClient` resolves the
playlist above to four entries, where it previously threw `No suitable extractor found`.

That closes this instance's cause. It does not close the class, which is what the frontier above is for.
