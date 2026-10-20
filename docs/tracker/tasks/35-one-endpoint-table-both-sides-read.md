# 35: One endpoint table both sides read

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The endpoint table is the one place a route path is written. `packages/contracts/src/endpoints.ts` gains `EndpointDeclaration` (method, path, errors); `ApiEndpoint<T>` extends it with a response reader, `ApiCommandEndpoint` and `ApiMediaEndpoint` are its aliases, and `defineMediaEndpoint` joins the two constructors. `trackStream` (`GET /tracks/:trackId/stream`) and `trackThumbnail` (`GET /tracks/:trackId/thumbnail`) join the table with their error codes.

The server registers from the declaration. `apps/server/src/shared/registerEndpoint.ts` takes the declaration and a handler, dispatches on `endpoint.method` and binds `endpoint.path`; the handler keeps its own request and reply types. All five route files (accounts, playlists, shares, sync runs, tracks) register through it, and every parameter name now matches the declaration (`playlistId`, `trackId`, `accountId`), where they were `:id`. The only literal path left in a feature is `GET /events`, the out-of-scope SSE transport.

The web builds both media URLs from the declaration. `mediaPath` and `mediaUrl` in `apps/web/src/shared/api/endpoints/endpoints.ts` derive from the endpoint; `PlayerAudio` (the stream source and the Media Session artwork), `PlayerBar`, `TrackRow` and `usePlaylistHeader` (thumbnails) use `mediaUrl`, and `streamFailure` probes through `mediaPath`. No web module writes a JSON or media URL by hand, and the mock harness already derives its patterns from the table through `endpointPattern`.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (server 386, web 499, packages 78); `pnpm test:e2e` is 35 passed. No new tests were added: the existing route, component and e2e suites are the regression net, and the server route tests call concrete URLs, so renaming a declared path fails them.

See [ARCHITECTURE.md](../../ARCHITECTURE.md).
