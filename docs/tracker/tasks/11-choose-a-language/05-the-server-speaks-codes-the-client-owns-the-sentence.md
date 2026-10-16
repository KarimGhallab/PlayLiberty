# 05: The server speaks codes, the client owns the sentence

**Status:** resolved

## Outcome

The server sends codes and parameters and the client owns the sentence. `ProblemSchema` gained an optional `params` record, with `title` and `detail` staying as the English fallback. `parseBody` returns the structured issues (`{ path, code }`) instead of a joined Zod message, and a failure is now `validation_failed` with `params: { path, issue }`; the add-track route keeps its 422. The four `playlist_not_found` details carry `params: { reason }` (read, write, manage, track) with the English `detail` kept, `invalid_request` and `unprocessable_request` are now single-purpose because their validation callers moved out so the client maps each by code, and `@playliberty/i18n` gained `problemDetail(t, problem)`, which maps the four reasons, the validation code and the two request codes to catalog sentences and falls back to the server's `detail`; the library, the detail's dialogs and `ReadFailure` read through it.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
