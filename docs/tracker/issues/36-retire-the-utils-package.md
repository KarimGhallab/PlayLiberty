# 36: Retire the utils package

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. The two used helpers moved to their owners and the package is gone.

- `exhaust` lives at `apps/server/src/shared/exhaust.ts`; the four route registrars import it from there.
- `isSubPath` is a private helper in `apps/server/src/platform/media/mediaPaths.ts`, used by the sharded path builder.
- `packages/utils` is deleted, and no package declares `@playliberty/utils`; the edge is removed from `apps/server/package.json`, `tsconfig.depcruise.json`, and both `apps/server/Containerfile` stages.
- `debounce`, its argument-spreading bug, and the other 19 unused exports are gone.
- `docs/ARCHITECTURE.md` no longer lists the package.

The observable behaviour is unchanged: `exhaust` throws the same message and `isSubPath` keeps its containment rule. The media path tests (`mediaPaths.test.ts`) and the four route suites still pass.

Verification: `pnpm run build` and `pnpm run lint` clean; unit suites exit 0 (server 325, web 396, youtube 31, i18n 39, tokens 3, ui-foundation 6); `npx depcruise .` reports no violations (242 modules); `npx syncpack lint` and `node ./scripts/validate-tsconfig-paths.cjs` pass.
