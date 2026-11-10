# 111: A crashed app is reported as a screen that never appeared

**State:** `resolved`
**Category:** `bug`

## Outcome

`apps/mobile/scripts/run-maestro.mjs` now tees Maestro's output instead of inheriting it, and reads each `[Failed] <flow name>` line as Maestro prints it, so a flow that died is explained while the batch is still running. A single flow gets no batch result line, so its check runs when Maestro exits.

The check reads the flow's own `logs/crash-report.txt` when Maestro wrote one, and otherwise `logs/device-logcat.txt` scoped by the app's tombstone header. It runs one `pidof` for the app and one read of that log per failed flow. A signal prints the signal and the top frame, an ANR prints its line, and an absent process prints `pidof ... returned nothing` with the `has died` line when the log holds one. A clean failed assertion prints nothing. The `pidof` is skipped only when the `adb` call itself fails, which is unknown rather than a crash. A signal in the shared device log is accepted only when the app's tombstone follows it, because logcat names the process `playliberty.app`, not the package `dev.playliberty.app`.

Reading the output costs Maestro its TTY, so the run now uses its plain renderer; the steps, results and summaries are unchanged.

Verification: replaying run 2's real crash report through the runner printed `Fatal signal 11 (SIGSEGV) ... pid 17983 (playliberty.app)` and `#00 ... MountingCoordinator::pullTransaction(bool) const+706`. A stub Maestro with a crash, a clean failure and a flow whose process was absent printed the first and third after their own result lines and nothing for the clean one, including the single-flow path where no result line exists. The real harness printed no crash block for a single clean failure, or for a two-flow run where one flow passed and one failed cleanly, and 110's artifact line still printed. The 15-flow suite was not rerun; the targeted harness runs used the changed runner.
