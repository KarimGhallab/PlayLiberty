# 118: The journeys run with system animations on

**State:** `resolved`
**Category:** `bug`

## Outcome

`e2e/scripts/mobile-journeys.sh` captures the device's window, transition and animator scales after the stack is up and before the app is installed or launched, then sets all three to 0. The existing `cleanup` trap restores the captured values on exit, deleting a key that was unset, so a failed or interrupted run gives the device back its settings. CI's `disable-animations: false` is gone, so the emulator action's own animation handling applies as well, and the README's mocked-harness section states that the journeys assume no system animation.

Verification: a harness run of `detail-add-batch` and `detail-remove-undo` sampled the device while the flows ran and read `0` for all three scales, and read `1`, `1`, `1` after the run. The run passed 2/2 in 1m 41s, with the batch flow at 1m 16s and the remove flow at 25s. The full 15-flow suite was not rerun; the two undo journeys are the measured record.
