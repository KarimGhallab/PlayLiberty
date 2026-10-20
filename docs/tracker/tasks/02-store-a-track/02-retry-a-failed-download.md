# 02: Retry a failed download on the next sync

**Status:** resolved

## Outcome

A failing download stores a bounded single-line reason: the adapter's message has its whitespace collapsed and
is capped at 200 characters, and the full error goes to the log, so the stored reason is a summary rather than
raw multi-line tool output. No stored file is written on a failure. The retry lives in the reconcile: when a
sync meets a source video whose track is `failed`, it returns that track to `pending` and clears the stale
reason, so the next worker pass claims it and stores it. Every other existing track is still left exactly as it
is, which keeps the append-only rule intact, and nothing retries on a timer because a failed track is not
`pending`.

See [`02-store-a-track.md`](../../specs/02-store-a-track.md).
