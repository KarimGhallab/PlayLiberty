# 120: The app crashes in Fabric while the hierarchy is polled

**State:** `wontfix`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Decision

Marked `wontfix` on 2026-11-05. The evidence and the proposed launch loop stay as the record.

## Agent Brief

**Category:** bug
**Summary:** The dev client died once in about 45 cold launches across three batches with a `SIGSEGV` on the JS thread inside `MountingCoordinator::pullTransaction`, while Maestro polled the view hierarchy during the first Fabric mount. The stack is entirely React Native and Hermes; no app code is in it.

**Current behavior:**
On 2026-11-05 at 09:40:01.661 the process `dev.playliberty.app` (pid 17983, uptime 9 s) took `SIGSEGV`, code 128, `fault addr 0x0`, on `tid 18035 (mqt_v_js)`. The backtrace starts at `MountingCoordinator::pullTransaction(bool) const+706`, through `FabricUIManagerBinding::schedulerDidFinishTransaction`, `Scheduler::uiManagerDidFinishTransaction`, `UIManager::shadowTreeDidFinishTransaction`, `ShadowTree::mount`, `ShadowTree::tryCommit`, `ShadowTree::commit`, and ends in `libhermesvm.so`. The system wrote `tombstone_12` and `data_app_native_crash`.

One millisecond before the fault Maestro logged `Requesting view hierarchy`; it was polling at roughly 10 Hz during `assert account-door`, and kept polling after the process died. The known upstream report for this signature names exactly that pairing: an accessibility client reading the hierarchy while Fabric is committing ([react-native-screens#4654](https://github.com/software-mansion/react-native-screens/issues/4654)). It also reports that the lifetime race behind it is fixed by [react-native-screens#4413](https://github.com/software-mansion/react-native-screens/pull/4413).

The app is on `react-native 0.86.3`, `expo ~57.0.31`, `react-native-screens ~4.26.0`, Fabric and Hermes. The crash is not reproducible on demand: one occurrence in three batches, each batch cold-starting the app 15 to 17 times.

**Desired behavior:**
A cold start never takes the process down, including while a hierarchy poller is attached. The crash is either fixed by a dependency that carries the upstream fix, or isolated with a patch whose provenance is recorded. Because it reproduces roughly once in 45 launches, the fix is only verified by a loop.

**Key interfaces:**

- The dependency that owns the crash sits under `apps/mobile` (`react-native-screens`, `expo`, `react-native`); the versions are pinned in `apps/mobile/package.json`.
- The verification loop is a script, not a flow: `am force-stop`, `am start` with the dev-client deep link, poll `uiautomator dump` or Maestro's hierarchy at 10 Hz while the app starts, repeat 50 times, fail on `Fatal signal`.
- The same loop must run against a build with the candidate version before the bump is accepted.

**Acceptance criteria:**

- [ ] A 50-launch cold-start loop with a hierarchy poller attached produces no `Fatal signal` and no `data_app_native_crash`.
- [ ] The candidate `react-native-screens` version is recorded with the upstream issue and pull request that justify it.
- [ ] If no released version carries the fix, the patch or the pin is recorded with its source.
- [ ] The loop is committed so the next dependency bump can re-run it.
- [ ] The runner reports this crash by name when it happens again (111).

**Out of scope:**

- The other e2e inconsistencies (110 to 119).
- Upgrading React Native or Expo beyond what the fix requires.

## Observed

- One native crash in three batches, during startup, on the JS thread, inside Fabric mounting.
- The hierarchy poller was active at the time and kept polling a dead process.

## Expected

- No crash across a repeated cold-start loop under the poller.

## Evidence

- `~/.maestro/tests/2026-11-05_093605/A playlist is shared at read, changed to write, then revoked/logs/crash-report.txt` (full tombstone excerpt).
- Same directory, `logs/device-logcat.txt:1050` (the signal), `:1000-1030` (the poll loop), `:1125-1245` (the frames).
- `apps/mobile/package.json`: `react-native 0.86.3`, `expo ~57.0.31`, `react-native-screens ~4.26.0`.
- Upstream: react-native-screens#4654, react-native-screens#4413.
