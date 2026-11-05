# 121: The mobile harness commits its own runtime artifacts

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None.

## Outcome

`.gitignore` now ignores `e2e/.mobile/` as a whole, and `e2e/.mobile-runs/`; the narrower `e2e/.mobile/maestro/` line is gone because the directory is covered. The tracked runtime entries left the index with `git rm -r -f --cached e2e/.mobile`; they were staged additions rather than committed history, so no deletion appears in the index, and the working copies stay on disk as ignored files.

The README's mocked-harness paragraph names the bound ports, 8095 for the server, 5295 for the web origin and 8096 for Metro, and `seed-mobile.mjs` defaults to 8095 instead of 8081. The live-runner paragraph keeps its own stack ports, 8080 and 5173, which are unchanged.

Verification: `git ls-files e2e/.mobile` is empty and `git check-ignore` matches the runtime files; a harness run of `detail-add-batch` and `detail-remove-undo` passed 2/2 and left `git status` with no `e2e/.mobile` entry, because the run's database, media, logs, Maestro artifacts and archive are all ignored. A fresh clone needs no directory: `rotate_work` creates `e2e/.mobile` and its `media` before the harness writes anything into it. `pnpm run lint:check`, `pnpm run build` and `pnpm test:unit` (614 mobile) pass.
