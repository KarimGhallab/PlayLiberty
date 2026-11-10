# 117: The emulator cannot hold the app under test

**State:** `wontfix`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Decision

Marked `wontfix` on 2026-11-05. The measurements and the proposed work stay as the record.

## Agent Brief

**Category:** bug
**Summary:** The AVD has 2048 MB of RAM while the dev client takes 830 to 900 MB per launch and swaps around 190 MB of it. The lowmemorykiller evicts system processes during a batch, and every flow in a batch is slower than the one before.

**Current behavior:**
`~/.android/avd/*.avd/config.ini` sets `hw.ramSize=2048`, `hw.cpu.ncore=4`, `hw.gpu.mode=auto`. The AVD is `@medium_phone`, API 36, x86_64, on a Play Store image. During the batch the system's MemTotal is 2531840 kB with roughly 140 MB free and 860 MB available; `dumpsys meminfo dev.playliberty.app` shows 290 MB of native heap with 193 MB swapped; `dumpsys meminfo` reports 1.1 GB in swap compressed into 313 MB of zram; logcat shows the lowmemorykiller killing Messages and the package installer with "low watermark is breached" while Maestro was running. After the run, one foreground switch to Settings and back left the app at 692 MB PSS with 502 MB of `SwapPss`, most of it native heap: the dev client's working set is over a gigabyte on a 2.5 GB guest. The per-flow durations in run 3 against run 1 grew by 25 to 45 percent (remove-undo 26 to 47 s, gallery-card 14 to 20 s, provisioning 29 to 36 s), with no code change, and a cold launch to an interactive library took 9.5 s in the run 3 log.

The host is the second half. It holds 30 GB, with 17 GB of anonymous pages, 10.35 GB of shmem (2.87 GB of it huge pages) and 4.5 GB already in swap; `Committed_AS` is 77.7 GB against a 24.3 GB limit. The emulator alone is 5.4 GB RSS with 425 MB of it swapped out, and it shares the machine with Brave at ~5.5 GB across its renderers, an idle Gradle daemon at 1.34 GB, the developer's Metro at 1.03 GB and a torrent client at 1.1 GB. zswap is off. A guest page that must be faulted back in can therefore cost a host swap read, which is why a single Maestro command took 2.6 to 7.7 s during the runs while the system UI measured 60 fps afterwards.

Each flow is a cold start of the dev client, which re-downloads the JS bundle over `adb reverse` (24 bundles in run 3, the first build 46 s). That is the moment the process needs the most memory and the moment the crash of 120 happened.

**Desired behavior:**
The emulator holds the app plus the system without swapping during a batch. The batch starts from the same device state every time: a reboot (or an explicit `am kill-all` and a swap check) before the run, and a measured swap figure in the run's report so degradation is visible instead of inferred.

**Key interfaces:**

- The AVD is developer tooling; the change is in the AVD configuration and the run script, not the app.
- The host also matters: 27 of 30 GB were in use with the emulator at 5.4 GB RSS during the investigation. A 4 GB AVD needs the host to have the room.
- The run script already reports elapsed time per flow through Maestro; a memory line is the missing half.

**Acceptance criteria:**

- [ ] A batch runs with no lowmemorykiller line for a foreground process and no more than 50 MB of app swap at any point.
- [ ] Three consecutive batches show per-flow durations that do not trend upward.
- [ ] The run prints the AVD's RAM, the app's PSS and its swap before the flows start and after the last one.
- [ ] The README says the RAM the AVD needs and how to reboot it.

**Out of scope:**

- The crash itself (120).
- Host swap and disk layout (119).

## Observed

- 2048 MB AVD, 890 MB app PSS at the end of several flows, 193 MB swapped.
- The lowmemorykiller evicted system apps during the run.
- Durations grew within a batch and between batches.

## Expected

- Room for the app and the system, and the same starting state for every batch.

## Evidence

- `~/.android/avd/*.avd/config.ini`.
- `adb shell cat /proc/meminfo` and `adb shell dumpsys meminfo dev.playliberty.app`, 2026-11-05.
- `adb shell dumpsys meminfo`: `ZRAM: 313,084K physical used for 1,093,000K in swap (1,898,876K total swap)`, `Used RAM: 2,132,545K` of `2,531,840K`.
- `adb shell dumpsys meminfo dev.playliberty.app` after a Settings round trip: `TOTAL 691893` PSS, `SwapPss 502674`, `Native Heap 69612` PSS with `415073` SwapPss.
- `~/.maestro/tests/2026-11-05_095143/A track is removed and restored with Undo/logs/maestro.log`: launch at 09:55:03.97, `account-door` visible at 09:55:13.48.
- `/proc/12873/status` on the host: `VmRSS: 5377072 kB`, `VmSwap: 428544 kB`.
- `/proc/meminfo` on the host: `Shmem: 10353784 kB`, `AnonPages: 16972476 kB`, `Committed_AS: 77698328 kB` against `CommitLimit: 24264164 kB`; `swapon` shows 4.3 GB of 8 GB in use.
- `adb logcat -b events | grep am_kill`: 18 kills of `dev.playliberty.app` between 09:53 and 10:03, each reporting 815 to 902 MB.
- `adb logcat`: `lowmemorykiller: Kill 'com.google.android.apps.messaging' ... reason: low watermark is breached`.
- The three run summaries: 10m 19s total, then the same 15 flows at 26/29/47 s for remove-undo.
