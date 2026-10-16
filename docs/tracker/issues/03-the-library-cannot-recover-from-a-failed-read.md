# 03: The library cannot recover from a failed read

**State:** resolved
**Category:** `bug`

## Outcome

Done. A blocking read failure now offers a way back, on all three surfaces.

- A new `ReadFailure` component draws the server's `detail` when the error is an `ApiError` that carries one,
  the fallback sentence otherwise, and one secondary **Try again** that refetches the read that failed and
  locks while it works. It is a real button, named by its own word.
- The library, the playlist detail's tracks read and the share dialog all draw it; the dialog's retry
  refetches both of its reads.
- Tests: the component (the detail, the fallback, the retry, the locked state), the library (the detail, the
  fallback, the recovery), the detail (the detail, the recovery) and the share dialog (the detail, the
  recovery).
- Recorded: the library has a "The failed read offers a way back" state beside loading, empty and
  signed-out. The library's now-unused `&__note` style was removed.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (328 tests), the full unit suite and the
e2e suite (27 tests) all pass. Not committed.
