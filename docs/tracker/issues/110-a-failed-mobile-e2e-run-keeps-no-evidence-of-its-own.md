# 110: A failed mobile e2e run keeps no evidence of its own

**State:** `resolved`
**Category:** `bug`

## Outcome

`e2e/scripts/mobile-journeys.sh` no longer deletes its harness directory. `rotate_work` moves the live `e2e/.mobile` to `e2e/.mobile-runs/<YYYYmmdd-HHMMSS>/` at the start of a run, recreates `e2e/.mobile/media`, and prunes the archive to the newest three runs. A run killed at any point therefore leaves its `server.log`, `web.log`, `metro.log`, `dismiss.log`, `scenario.json`, database, media and `maestro/` artifacts for the next run to archive instead of overwrite. An interrupted run's `env.local.backup` now survives there too, which is evidence for 122 rather than a fix of it.

The live runner, which has no run directory, keeps Maestro's default and prints the directory that appeared under `~/.maestro/tests`. `.gitignore` covers `e2e/.mobile-runs/` and `e2e/.mobile/maestro/`, and `.maestro/README.md` gained "Where a run leaves its evidence".

Verification: two harness runs of `gallery-card` left run 1 archived at the start of run 2 (`e2e/.mobile-runs/20261105-104201/` with `server.log`, `web.log`, `metro.log` and the rest) while run 2 stayed live; a deliberate failing flow printed `maestro artifacts: /mnt/Fichier/Documents/Projets/PlayLiberty/e2e/.mobile/maestro/2026-11-05_105010` and left that directory populated; the rotation block, run five times against a fixture, kept the newest three and pruned the rest. The 15-flow suite was not rerun; the two earlier full-suite runs it preserves are the 2026-11-05 batches.
