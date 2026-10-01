# 02: Retry a failed download on the next sync

**What to build:** A download that fails does not cost the listener the song. The worker marks the track
`failed` with a short reason a person can read and leaves no stored file, and the next sync returns a failed
track the source still lists to `pending`, so the worker picks it up again. Nothing retries on a timer; a
failed track waits for a sync.

**Blocked by:** 01.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A failing download leaves the track `failed` with a short failure reason and no stored file.
- [x] The next sync returns a failed track that is still in the source to `pending`.
- [x] The retried track is then downloaded and stored.
- [x] Nothing retries a failed track on a timer.

## Outcome

Implemented and verified. A failing download now stores a bounded single-line reason: the adapter's message has
its whitespace collapsed and is capped at 200 characters, and the full error goes to the log. That is what the
design records mean when they say the row carries a mapped phrase and the server's words stay available for a
report, so the stored reason is a summary rather than raw multi-line tool output. No stored file is written on
a failure.

The retry lives in the reconcile: when a sync meets a source video whose track is `failed`, it returns that
track to `pending` and clears the stale reason, so the next worker pass claims it and stores it. Every other
existing track is still left exactly as it is, which keeps the append-only rule intact. Nothing retries on a
timer: a failed track is not `pending`, so a later pass does not claim it.

Verification: `pnpm run test` (96 server tests, 4 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
