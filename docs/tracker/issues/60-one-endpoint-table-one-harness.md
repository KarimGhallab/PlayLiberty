# 60: One endpoint table, one harness

**State:** `resolved`
**Category:** `enhancement`

## Outcome

One endpoint table in `packages/contracts/src/endpoints.ts` declares the JSON endpoints once: method, path, response schema and the `ProblemCode`s the route can answer. `queries.ts` and `useEventStream.ts` send through `apps/web/src/shared/api/endpoints/endpoints.ts`, which substitutes the declared parameters; the transport in `client.ts` is unchanged, and SSE stays out of the table. `PlaylistPage`, `AccountSummaryPage` and `PlaylistTrackList` are inferred from contract schemas, and `PlaylistTracksRead` takes its contract fields from `PlaylistTracksPage`.

The harness builds fixtures from contract types and parses every response through the endpoint schema before answering. `mockUrl` derives MSW patterns from the declaration, leaving omitted parameters as `:name`, and the tests that override handlers use it instead of writing URLs. Problems answer through `problemResponse`, whose `code` is a `ProblemCode`, so a fixture outside the contract no longer compiles; the `service_unavailable` fixtures became `ProblemCode.InternalError`. Media endpoints stay outside the table because they carry no JSON response schema.
