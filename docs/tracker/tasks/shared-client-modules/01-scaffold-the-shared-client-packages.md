# 01: Scaffold the shared client packages

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The clients share the contracts, the query keys, the tokens, the localization and the non-rendering UI decisions. They share no data layer and no player rule. Both apps hold their own copy of the API error type, the protocol constants and the playable check.

## Expected

Two packages exist and carry their first module. `@playliberty/client-data` owns the API error, the problem reader and the protocol constants. `@playliberty/player` owns the playable rule. Both apps import them and their local copies are gone.

The packages follow the shape of `ui-foundation`: one barrel, a build config, a test config, and the standard scripts. The workspace paths, the build filter and the app dependencies name both.

## Evidence

The review of 3 November 2026 found the error type, the problem parse and the header constants written in both clients, and the playable rule written twice with the mobile copy a strict subset of the web one. The packages the clients already share prove the pattern: `contracts`, `query`, `tokens`, `ui-foundation` and `i18n`.

## Acceptance criteria

- [ ] `@playliberty/client-data` and `@playliberty/player` build with the same manifest and tsconfig shape as `ui-foundation`, including the test script.
- [ ] `tsconfig.depcruise.json`, the root `build:packages` filter, and both app manifests name both packages.
- [ ] `scripts/validate-tsconfig-paths.cjs` passes.
- [ ] `client-data` exports the API error, the problem reader and the protocol constants. Both apps import them.
- [ ] `player` exports the playable rule, both the single-track and the whole-playlist form. Web uses both. Mobile uses the single-track form.
- [ ] No package imports an application.
- [ ] The local copies of the moved symbols are deleted.

## Verification

`pnpm run build`, `pnpm run lint:check`, `node scripts/validate-tsconfig-paths.cjs`, `pnpm run test:unit`.
