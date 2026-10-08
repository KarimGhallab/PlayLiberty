# 05: The server speaks codes, the client owns the sentence

**What to build:** the server returns a stable code and structured parameters and the client owns the sentence.
`ProblemSchema` gains `params`; where the copy varies under one code (the four `playlist_not_found` details) the
difference travels as a parameter; a Zod validation failure becomes a structured code instead of Zod's English
prose; the client maps a problem code to a catalog sentence and falls back to the server's English for an
unmapped code. A refusal reads in the chosen language.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] `ProblemSchema` carries `params`, the server fills it where the copy varies, and the server's `title` and
      `detail` remain as the English fallback.
- [x] A validation failure reaches the client as a structured code and parameters, not as Zod's English message.
- [x] The client renders a known problem code as a catalog sentence and an unmapped code as the server's English.
- [x] The existing server and client problem tests keep passing in `en`.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

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
