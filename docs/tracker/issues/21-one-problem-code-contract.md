# 21: One problem-code contract

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The server writes problem codes as string literals in about thirty places and the client maps four of them in a separate switch, with nothing tying the two lists together; the `ApiError` unwrap is repeated at four call sites, and the validation params travel the wire unused.

**Current behavior:**
`ProblemSchema.code` is a plain string, so nothing constrains the set of codes. The server writes `playlist_not_found` with a `reason` param longhand at eleven sites, and the other codes across the routes. The client's `problemDetail` hardcodes the same code literals independently and branches on the reason, and four call sites each write the `instanceof ApiError` unwrap. The `validation_failed` branch ignores the `path` and `issue` params the server sends. The English `detail` sentences are duplicated verbatim between the server's fallback and the catalog.

**Desired behavior:**
`packages/contracts` owns a `ProblemCode` union and the reason set, so the server cannot write a code outside it and the client's mapping is checked against the same type. One client helper turns an error into a sentence: it unwraps the `ApiError`, maps the code and its params, and falls back to the server's `detail`. The duplicate English sentences are removed once the contract is shared.

**Key interfaces:**

- The `ProblemCode` union and the reason set live in `packages/contracts` and are shared by the server and the client.
- One client helper takes an error and the translator and returns a sentence (or null).
- `ProblemSchema.code` is the union, or the union is enforced where problems are built.

**Acceptance criteria:**

- [x] The problem codes and the reason set are one shared contract in `packages/contracts`.
- [x] The server cannot build a problem with a code outside the contract.
- [x] The client's mapping is checked against the same contract.
- [x] One client helper unwraps the error and maps it; the four inline unwraps are gone.
- [x] The English `detail` sentences are no longer duplicated between the server and the catalog.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The catalog copy (spec 11 owns the sentences).
- New codes or a change to the HTTP status mapping.
- Making the validation params user-visible copy, unless the map needs them.

## Outcome

Done. One contract owns the codes and the reasons, and one client helper maps an error to a sentence.

- `packages/contracts` now exports `ProblemCode` (the twenty-two codes the server may answer with) and `PlaylistNotFoundReason` (`read`, `write`, `manage`, `track`). The server and the client share both.
- The server cannot build a problem outside the contract: `ProblemInput.code` is `ProblemCode`, and every `sendProblem` site names a member rather than a literal. `sendPlaylistNotFound(reply, reason)` replaces the eleven longhand `playlist_not_found` blocks, and the csrf, identity, error and not-found handlers name their members too.
- `ProblemSchema.code` stays `z.string()`, not the enum, so a code a newer server sends is still parsed and falls back to its `detail` rather than failing the whole document. The union is enforced where problems are built, which is the contract's other half.
- A new `problemSentence(t, error)` in the web app is the one unwrap: it returns the catalog sentence for an `ApiError`'s problem, the server's `detail` for a code the catalog does not know, and null otherwise. The four inline `error instanceof ApiError ? problemDetail(...)` unwraps are gone, and `ReadFailure`'s private `problemFrom` with them. `problemDetail` now compares against the shared members, so a rename on either end is a compile error.
- The duplicated English is gone from the server: the `playlist_not_found` sentences, the `validation_failed` detail, and the `invalid_request` and `unprocessable_request` messages no longer travel. The catalog owns those sentences, and the client maps the code and its reason to them.

Tests: a new `problemSentence.test.ts` covers the unwrap and the mapping (known code with its reason, unmapped code falls back to `detail`, a non-`ApiError`, a null problem, no error). The i18n `problemDetail` test keeps passing; the one server test that asserted the removed `invalid_request` detail now asserts its code.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 396, server 318, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.

## Observed

- `ProblemSchema.code` is `z.string()`.
- About thirty `sendProblem` sites write code literals; `playlist_not_found` with a reason is written longhand eleven times.
- `problemDetail` hardcodes the codes; the `ApiError` unwrap is repeated at four call sites.
- The English `detail` is duplicated between the server and the catalog.

## Expected

One contract owns the codes and the reasons; one client helper maps an error to a sentence.

## Evidence

- `schemas.ts:124` `code: z.string()`.
- `packages/i18n/src/problem/problem.ts` `problemDetail`, and its four call sites.
- Architecture review, candidate 6, "One problem-code contract".
