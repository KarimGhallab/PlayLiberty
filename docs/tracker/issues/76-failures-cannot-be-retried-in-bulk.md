# 76: Failures cannot be retried in bulk

**State:** `resolved`
**Category:** `enhancement`

## Outcome

One control now retries every failed track the account can curate. It reads the live failed count, so it says `Retry all 3 failed tracks` and, while working, `Retrying all 3 failed tracks...` with the shared spinner. The same `RetryFailedControl` is drawn in the state block under the failed band and in the failed view above the rows. Only one is drawn at a time: the failed view carries it while the failed filter is active, and the state block carries it otherwise, so the screen never offers two retries for the same set.

`useRetryFailedTracks` pages through the failed read before pressing the existing per-track retry route, so a set larger than one page is still retried whole. The loop is client-side, as the ticket allowed; the tracks and playlist are invalidated once when the attempts settle, including after a refusal. The row menu keeps its per-row Retry and Fetch whole unchanged.

The new tests cover the summary control, the failed-view assembly that presses one control and posts every failed id, and a 101-track set that spans two failed pages.
