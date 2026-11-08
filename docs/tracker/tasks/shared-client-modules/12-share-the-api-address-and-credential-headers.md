# 12: Share the API address and credential headers

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

Mobile builds the same API address in three adapters: the media source, the stream source and the live event source. Each trims the base URL, adds the API prefix, substitutes the endpoint path and builds the same three credential headers. Web builds the same address once for a media route. The origin rule and the header names live in three or four places.

## Expected

`@playliberty/api-client` owns two small builders. One returns the absolute API address for a path. One returns the credential headers for a token and user agent. The media, stream and live adapters keep only their target shape. Web media URL uses the same address builder.

## Evidence

- Mobile `streamSource`, `mediaSource` and `eventsSource` each repeat the base trim, `API_PREFIX` and the three header names.
- Web `mediaUrl` builds the same origin through the transport.
- A credential header rename today touches three mobile modules and the shared client.

## Acceptance criteria

- [x] `api-client` owns the origin, prefix and path rule for a client-side address.
- [x] `api-client` owns the access token and user agent header names.
- [x] The three mobile adapters and the web media URL call the shared builders.
- [x] Each adapter still returns its own shape, and no adapter repeats a header name.

## Outcome

`@playliberty/api-client` exports `apiUrl`, `accessHeaders`, `AccessToken` and `USER_AGENT_HEADER`. `apiUrl` joins the base URL, the API prefix and the path with one slash. `accessHeaders` builds the access pair and the user agent headers.

The shared transport uses `apiUrl`. The web media URL uses `apiUrl` with an empty base. The mobile media, stream and live adapters call both builders. The mobile `USER_AGENT` value stays local, and the header name moves to the client.

Verification: api-client runs 47 tests, the web shared API and header suites 86, the mobile affected suites 85. `pnpm run build`, `pnpm run lint:check` and `pnpm run test:unit` pass.

## Verification

A package test proves the address for a path with and without a trailing slash, and the three headers. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
