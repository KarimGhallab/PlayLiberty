# One endpoint table both sides read

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Every route path is declared once in `packages/contracts/src/endpoints.ts` and consumed by the web client, the mock harness and the server's registration. `stream` and `thumbnail` join the table.

## Context

`docs/ARCHITECTURE.md` says the contracts define the `/api/v1` REST surface shared by both clients and the server, so a change breaks the build rather than the user. Today only the web client and its mocks read the table. The server registers literal paths, its parameter names already differ (`:id` against `:playlistId`), and the two media routes are declared nowhere. Adopt the declaration feature by feature.

Architecture review 2026-10-19, candidate 3.

## Scope

- Extend the endpoint declaration so the server can register from it: method, path, response reader, error codes, and the parameter names the route expects.
- A server registrar reads the declaration and binds the existing handler. The handler keeps its request and reply behaviour. Only the method and path come from the table.
- Migrate the JSON routes one feature at a time: accounts, playlists, shares, sync runs and tracks.
- Declare `GET /tracks/:trackId/stream` and `GET /tracks/:trackId/thumbnail` in the table, and build both URLs from the declaration in the web client.
- Align parameter names between the declaration, the server route and the mock pattern.
- Delete the literal paths once no caller remains.

## Out of scope

Request body schemas, which stay with the route as today; the SSE transport; the transport in the web client; response shapes.

## Blocking edges

None. Can start immediately.

## Verification

- No server route registers a literal path for a declared endpoint.
- No web module writes a JSON or media URL by hand.
- Renaming a declared path fails the build or a route test on both sides.
- The mock harness derives its patterns from the same declaration.
- `pnpm run build`, `pnpm run lint`, all unit suites and `pnpm test:e2e` pass.
