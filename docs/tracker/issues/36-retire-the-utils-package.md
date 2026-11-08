# 36: Retire the utils package

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The two used helpers moved to their owners and the package is gone. `exhaust` lives at `apps/server/src/shared/exhaust.ts`, imported there by the four route registrars, and `isSubPath` is a private helper in `apps/server/src/platform/media/mediaPaths.ts`, used by the sharded path builder. `packages/utils` is deleted, no package declares `@playliberty/utils`, and the edge is removed from `apps/server/package.json`, `tsconfig.depcruise.json`, and both `apps/server/Containerfile` stages. `debounce`, its argument-spreading bug, and the other 19 unused exports are gone, and `docs/ARCHITECTURE.md` no longer lists the package. Observable behaviour is unchanged: `exhaust` throws the same message and `isSubPath` keeps its containment rule.
