# 21: One problem-code contract

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

One contract owns the codes and the reasons, and one client helper maps an error to a sentence. `packages/contracts` exports `ProblemCode` (the twenty-two codes the server may answer with) and `PlaylistNotFoundReason` (`read`, `write`, `manage`, `track`); `ProblemInput.code` is `ProblemCode`, and every `sendProblem` site names a member, with `sendPlaylistNotFound(reply, reason)` replacing the eleven longhand `playlist_not_found` blocks. `ProblemSchema.code` stays `z.string()` rather than the enum, so a code a newer server sends is still parsed and falls back to its `detail` rather than failing the whole document. A new `problemSentence(t, error)` is the one unwrap, returning the catalog sentence for an `ApiError`'s problem, the server's `detail` for a code the catalog does not know, and null otherwise; it replaced the four inline `error instanceof ApiError ? problemDetail(...)` unwraps and `ReadFailure`'s private `problemFrom`.
