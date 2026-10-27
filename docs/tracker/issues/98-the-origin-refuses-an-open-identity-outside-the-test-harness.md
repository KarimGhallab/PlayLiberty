# 98: The origin refuses an open identity outside the test harness

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Observed

`loadConfig` requires `EDGE_ASSERTION` only when `NODE_ENV` is exactly `production`. Every other value, including the documented `development`, leaves the assertion optional, and the identity hook then trusts any `Remote-*` header it receives. The default `HOST` is `0.0.0.0`, so the open server is reachable from the LAN. The documented development environment uses both defaults.

## What to build

An operator cannot accidentally run an open origin outside the test harness. Every non-test runtime requires the edge assertion and fails boot without it. `HOST` defaults to loopback, and a non-loopback bind needs an explicit insecure-development opt-in. The documented development flow still starts, with a local assertion or the explicit opt-in. The runtime is classified once as test, development, or production, and the identity decision reads that classification rather than comparing raw `NODE_ENV`.

## Evidence

- `apps/server/src/platform/config/loadConfig/loadConfig.ts:18,75-79`
- `apps/server/src/app/hooks/identity/identity.ts:82-99`
- `apps/server/.env.example:3-9,22-24`
- Repro: start the server with the documented development environment, then send `Remote-User: <any id>` to `http://<host>:8080/api/v1/me`. The server returns that account without an assertion.

## Acceptance criteria

- [ ] A non-test server started without `EDGE_ASSERTION` exits before listening and names the missing setting.
- [ ] `HOST` defaults to `127.0.0.1`.
- [ ] A non-loopback `HOST` without the explicit opt-in fails boot.
- [ ] The test harness still resolves a forwarded identity without an assertion.
- [ ] The documented development flow still starts with a local assertion or the explicit opt-in.
- [ ] The environment example and the architecture text no longer describe an open development origin.
- [ ] Tests cover the boot decisions and the test-harness exemption.

## Agent Brief

- Classify the runtime once, with a test case distinct from development and production.
- Require the edge assertion in every non-test runtime and fail boot before the listener starts.
- Default the bind to loopback; require an explicit insecure-development flag for any other address.
- Keep the test context's identity stub working without weakening the runtime rule.
- Update the environment example, the dev compose file, and the architecture decision.
- Add tests for the missing assertion, the non-loopback bind, the explicit opt-in, and the test exemption.

## Verification

- `pnpm --filter @playliberty/server test`
- `pnpm run build`
- `pnpm run lint:check`
- Manual: start the server with the documented development environment and confirm it listens on loopback with a local assertion or the explicit opt-in, and refuses to start when the assertion is removed.
