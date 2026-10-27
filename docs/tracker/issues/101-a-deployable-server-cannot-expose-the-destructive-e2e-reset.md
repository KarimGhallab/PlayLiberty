# 101: A deployable server cannot expose the destructive e2e reset

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** 98 (The origin refuses an open identity outside the test harness).

## Observed

`buildApp` registers `registerE2eRoutes` whenever `NODE_ENV` is exactly `test`. The reset route deletes every account, playlist, share, track, and media directory. It has no admin check and no separate secret. It sits under `/api/v1`, so the public origin proxies it. The route module is compiled into the production build because only `*.test.ts` files are excluded. One environment string turns a deployable server into an instance-wide destructive surface.

## What to build

A deployable server never exposes the destructive reset. The reset and drain routes are excluded from the production build and register only in the test harness. Even a runtime that identifies as a test cannot register them without an explicit test-harness flag. The reset requires an admin account and the explicit flag, or is available only inside the harness. The e2e suite still resets and drains through its own harness.

## Evidence

- `apps/server/src/app/testing/e2eRoutes.ts:28-57`
- `apps/server/src/app/buildApp.ts:214-219`
- `apps/server/src/platform/config/loadConfig/loadConfig.ts:16`
- `apps/server/tsconfig.build.json`
- Repro: start a deployable server with `NODE_ENV=test`, then send `POST /api/v1/__e2e__/reset` with `X-PlayLiberty-Client` as any authenticated account. Every row and media directory is deleted.

## Acceptance criteria

- [ ] A production build does not contain the reset or drain route modules.
- [ ] A deployable runtime with `NODE_ENV=test` does not register the reset unless the explicit test-harness flag is set.
- [ ] The reset requires an admin account and the explicit flag, or is available only inside the test harness.
- [ ] A normal authenticated account gets 404 on the reset in a deployable runtime.
- [ ] The e2e suite still resets and drains through its harness.
- [ ] Tests cover the build exclusion and the runtime gate.

## Agent Brief

- Use the runtime classification from 98; do not add a second raw `NODE_ENV` comparison.
- Exclude the test route modules from the production build.
- Gate registration on the test harness and an explicit flag; keep the reset out of the public API surface otherwise.
- Require an admin account for the reset if it remains reachable outside the harness.
- Update the e2e harness to set the flag and keep its reset and drain journey.
- Add a test that a normal account cannot reset a deployable runtime.

## Verification

- `pnpm run build`
- `pnpm --filter @playliberty/server test`
- `pnpm --filter @playliberty/e2e run typecheck`
- `pnpm run lint:check`
- Manual: inspect the production build output and confirm the reset module is absent.
