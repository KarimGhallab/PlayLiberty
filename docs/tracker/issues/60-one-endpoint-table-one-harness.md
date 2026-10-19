# 60: One endpoint table, one harness

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Every endpoint is declared twice, once by the query module and once by the mock harness, and the harness re-derives shapes the contract schemas already own, so it drifts silently.

**Current behavior:**
`client.ts` owns the transport: one send path holding the client header, the same-origin guard and the error mapping, taking a raw path per verb. The endpoint facts therefore live in the callers. `queries.ts` writes 21 endpoints as a literal path with a response schema, plus two response shapes it declares by hand: `PlaylistPage` (`:55-60`), which restates `Page<PlaylistWithCounts>` built by `createPageSchema` on the line above, and `PlaylistTracksRead` (`:186-201`).

`testing/mocks/handlers.ts` is 429 lines that write every URL a second time around `http://localhost:3000/api/v1`, with hand-built response literals, and it imports nothing from `@playliberty/contracts`, re-deriving the counts shape by hand (`EMPTY_COUNTS` / `countsOf`). Eight test files run against it.

The drift is real rather than theoretical: ten test sites answer with `service_unavailable`, which is not a member of `ProblemCode`, and `ProblemSchema.code` is `z.string()`, so neither the compiler nor the parser rejects it.

**Desired behavior:**
One declaration per endpoint, carrying its method, its path and its response schema, read by the query module and by the mock handler, so neither writes a URL. The mock's fixtures are built through the contract schemas, so a shape change fails at build time instead of shipping. Adding an endpoint costs one declaration.

**Key interfaces:**

- An endpoint declaration: method, path, response schema, and the error shapes the endpoint may answer.
- The query module and the mock read declarations; a URL is written once, in the declaration.
- Error codes come from `ProblemCode`, so a code outside the contract is a type error.

**Acceptance criteria:**

- [ ] The mock handlers import the contract and build their responses through it.
- [ ] Each endpoint's path is written in one place.
- [ ] The two hand-written response shapes are inferred from the contract.
- [ ] A fixture that answers with a code outside `ProblemCode` fails typecheck or parse.
- [ ] The eight suites that run against the harness keep passing.
- [ ] `pnpm run build`, `pnpm run lint`, the unit suites and `pnpm test:e2e` pass.

**Out of scope:**

- The server's route registrars and its service layer.
- The transport and the error unwrap in `client.ts`, which stay where they are.
- The SSE transport.

## Observed

- `handlers.ts` imports nothing from `@playliberty/contracts` and hand-builds every response.
- Every endpoint's path is written in both `queries.ts` and `handlers.ts`.
- `service_unavailable` appears in ten test sites and in no `ProblemCode` member.

## Expected

One declaration per endpoint; the harness derives from the contract.

## Evidence

- `apps/web/src/testing/mocks/handlers.ts` (429 lines, 0 contract imports).
- `apps/web/src/shared/api/queries/queries.ts:50-60`, `:186-201`.
- `packages/contracts/src/schemas.ts:132-136`.
- `packages/contracts/src/enums.ts:71-94`.
- Architecture review 2026-10-16, candidate 2.
