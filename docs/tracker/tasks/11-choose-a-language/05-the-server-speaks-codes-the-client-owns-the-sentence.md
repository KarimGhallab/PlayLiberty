# 05: The server speaks codes, the client owns the sentence

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).
**Status:** resolved

## Outcome

Done. The server sends codes and parameters and the client owns the sentence.

- `ProblemSchema` gained an optional `params` record; `title` and `detail` stay as the English fallback.
- `parseBody` returns the structured issues (`{ path, code }`) instead of a joined Zod message, and a failure is
  now `validation_failed` with `params: { path, issue }`. The add-track route keeps its 422.
- The four `playlist_not_found` details carry `params: { reason }` (read, write, manage, track), and the English
  `detail` stays.
- `invalid_request` and `unprocessable_request` are now single-purpose, because their validation callers moved
  out, so the client maps each by code.
- `@playliberty/i18n` gained `problemDetail(t, problem)`: the four reasons, the validation code and the two
  request codes map to catalog sentences, and any other code falls back to the server's `detail`. The library,
  the detail's dialogs and `ReadFailure` read through it.

Verification: `pnpm run build`, `pnpm run lint`, `pnpm run format` and the unit suites pass. Not committed.
