# 21: One problem-code contract

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. One contract owns the codes and the reasons, and one client helper maps an error to a sentence.

- `packages/contracts` now exports `ProblemCode` (the twenty-two codes the server may answer with) and `PlaylistNotFoundReason` (`read`, `write`, `manage`, `track`). The server and the client share both.
- The server cannot build a problem outside the contract: `ProblemInput.code` is `ProblemCode`, and every `sendProblem` site names a member rather than a literal. `sendPlaylistNotFound(reply, reason)` replaces the eleven longhand `playlist_not_found` blocks, and the csrf, identity, error and not-found handlers name their members too.
- `ProblemSchema.code` stays `z.string()`, not the enum, so a code a newer server sends is still parsed and falls back to its `detail` rather than failing the whole document. The union is enforced where problems are built, which is the contract's other half.
- A new `problemSentence(t, error)` in the web app is the one unwrap: it returns the catalog sentence for an `ApiError`'s problem, the server's `detail` for a code the catalog does not know, and null otherwise. The four inline `error instanceof ApiError ? problemDetail(...)` unwraps are gone, and `ReadFailure`'s private `problemFrom` with them. `problemDetail` now compares against the shared members, so a rename on either end is a compile error.
- The duplicated English is gone from the server: the `playlist_not_found` sentences, the `validation_failed` detail, and the `invalid_request` and `unprocessable_request` messages no longer travel. The catalog owns those sentences, and the client maps the code and its reason to them.

Tests: a new `problemSentence.test.ts` covers the unwrap and the mapping (known code with its reason, unmapped code falls back to `detail`, a non-`ApiError`, a null problem, no error). The i18n `problemDetail` test keeps passing; the one server test that asserted the removed `invalid_request` detail now asserts its code.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 396, server 318, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.
