# 119: The harness writes its data to an NTFS mount

**State:** `wontfix`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Decision

Marked `wontfix` on 2026-11-05. The measurements and the proposed work stay as the record.

## Agent Brief

**Category:** bug
**Summary:** The harness database, its media store, its logs and the Metro cache all live on `/mnt/Fichier`, an NTFS volume mounted through `fuseblk`. Throughput is fine; per-syscall latency and the absence of inotify are not, and the server, Vite and Metro all depend on that path at once.

**Current behavior:**
`df -T /mnt/Fichier/Documents/Projets/PlayLiberty` reports `fuseblk`, and `findmnt` shows `/dev/nvme0n1p3` mounted with `allow_other,default_permissions`. The harness writes `$work` (`e2e/.mobile`): the SQLite database with its WAL, the media root the tracks are streamed from, the scenario file and the three logs. Metro reads the whole module graph from the same volume, and Vite serves the web origin from it.

A 32 MB sequential write measured 2.1 GB/s, so the volume is not slow in throughput. FUSE turns metadata operations into round trips through a user-space daemon, and SQLite leans on locking, `fsync` and shared-memory files. Three node processes plus the emulator's file-backed disk compete for that path during a run.

**Desired behavior:**
The run's mutable state lives on a native filesystem, and the logs are copied back where they can be read after a failure. The measure is a batch whose per-flow variance is lower than the 2026-11-05 series, with the server's request latency in the log.

**Key interfaces:**

- `$work` is set at the top of `e2e/scripts/mobile-journeys.sh`; `E2E_MOBILE_ENV` already lets the seed write elsewhere.
- The target is ext4, not `/tmp`: on this host `/tmp` is tmpfs (15875560 kB, 268 MB in use), so a run's database and media there would spend host RAM the emulator already lacks. `~/.cache` or `/var/tmp` are on `/dev/nvme0n1p6` (ext4).
- The logs must survive a failure, so a native `$work` needs a copy-back step in the failure path (110 owns the lifecycle).
- The repository itself stays where it is; moving the checkout is not required for this ticket.

**Acceptance criteria:**

- [ ] The database, media root and logs live on a native filesystem during a run.
- [ ] A failed run leaves the logs readable from the repository.
- [ ] A batch is measured on both layouts and the comparison is recorded.
- [ ] The README states where the run's state lives and why.

**Out of scope:**

- Moving the repository or `node_modules`.
- The emulator's own disk image (117).

## Observed

- The run's state is on a FUSE mount.
- The same mount carries Metro's cache and the web origin's sources.

## Expected

- Mutable run state on a native filesystem, with the logs brought back on failure.

## Evidence

- `df -T` and `findmnt -T /mnt/Fichier`, 2026-11-05: `fuseblk`, `/dev/nvme0n1p3`.
- `e2e/scripts/mobile-journeys.sh:12-18` (the ports and `$work`).
- `e2e/scripts/mobile-journeys.sh:64-84` (the server environment, `DATABASE_PATH`, `MEDIA_ROOT`, `E2E_FAKE_SCRIPT`).
