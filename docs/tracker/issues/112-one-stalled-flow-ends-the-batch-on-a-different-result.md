# 112: One stalled flow ends the batch on a different result

**State:** `wontfix`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** One Maestro invocation runs all 15 journeys; a flow that loses a race against the device takes the batch with it and the result is a different set of failures every run, even though the device and the code are unchanged.

**Current behavior:**
`apps/mobile/scripts/run-maestro.mjs` spawns `maestro test` once with every selected flow and inherits its exit code. Maestro has no per-flow retry, so a flow that fails on a device stall is recorded as failed and the suite proceeds. The runner keeps no machine-readable result, so a rerun of just the failed flows has to be assembled by hand from the console output.

The 2026-11-05 evidence: the same three batches gave 15/15, 13/15 and 14/15. The remove-undo failure is a deadline race (114, 115) and the share failure is a crash (120); neither is a product regression introduced between runs.

**Desired behavior:**
The suite emits a machine-readable result and re-runs the flows that failed once, recording that they needed the retry. The run reports both the first-attempt failures and the final outcome, so a real regression is never hidden. A flow that fails twice is a failure.

**Key interfaces:**

- The runner already resolves the flow list; it can invoke Maestro once per selected flow, or twice over a failed subset. One invocation keeps the console output; per-flow invocations make retries and timings trivial but cost process startup, which is small next to a 10 minute batch.
- Maestro writes per-flow command metadata and durations under `~/.maestro/tests`; that is enough for a retry, but a formal result file is better than scraping the console.
- The exit code stays the batch's, and a retried flow that passes still prints its first failure.

**Acceptance criteria:**

- [ ] The run writes a machine-readable result listing each flow, its status and its duration.
- [ ] A failed flow is retried once, and the retry is visible in the summary.
- [ ] A flow that fails twice still fails the batch.
- [ ] The runner can re-run a single named flow, which it already can through its argument list.

**Out of scope:**

- Hiding a deterministic failure behind retries.
- The per-flow timeouts and the device configuration (117, 118).

## Decision

Rejected on 2026-11-05. A retry tolerates an inconsistent suite: a failure is a failure. The implementation was reverted, and the runner is back to one Maestro invocation per run. The inconsistencies are tracked in 114, 115, 117, 118 and 120; the suite is green only when a batch passes on its first attempt. A machine-readable per-flow result, if still wanted, is a separate ticket and does not depend on a retry.

## Observed

- Three back-to-back batches, same command, same emulator: 15/15, 13/15, 14/15.
- The failed flows differ, and each failure has a distinct cause in the logs.

## Expected

- A device stall costs one retry, not a batch, and the outcome is stated.

## Evidence

- `apps/mobile/scripts/run-maestro.mjs:180-196`.
- `~/.maestro/tests/2026-11-05_091915` (15 flows), `2026-11-05_093605` (2 failed), `2026-11-05_095143` (1 failed).
- `~/.maestro/tests/2026-11-05_093605/A track is removed and restored with Undo/commands.json`: the remove tap took 7.72 s, longer than the 6 s undo window.
