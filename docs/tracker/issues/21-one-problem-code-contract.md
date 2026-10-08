# 21: One problem-code contract

**State:** `ready-for-agent`
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

- [ ] The problem codes and the reason set are one shared contract in `packages/contracts`.
- [ ] The server cannot build a problem with a code outside the contract.
- [ ] The client's mapping is checked against the same contract.
- [ ] One client helper unwraps the error and maps it; the four inline unwraps are gone.
- [ ] The English `detail` sentences are no longer duplicated between the server and the catalog.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The catalog copy (spec 11 owns the sentences).
- New codes or a change to the HTTP status mapping.
- Making the validation params user-visible copy, unless the map needs them.

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
