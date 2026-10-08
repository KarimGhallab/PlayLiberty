# 36: Retire the utils package

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** `@playliberty/utils` is a 21-export grab-bag that the whole repo realizes through two symbols, has no tests, and carries a real argument-spreading bug in an unused helper.

**Current behavior:**
`@playliberty/utils` exports types, file-system helpers, path helpers, `debounce`/`throttle`, collections helpers and `exhaust`/`hasErrorMessage`. One app imports it and uses two symbols: `exhaust` in four route registrars and `isSubPath` in the media paths module. The rest has no caller, there are no tests under the package, and `debounce` calls `setTimeout(() => fn(args), wait)`, passing one array where the function's own arguments belong.

**Desired behavior:**
The two used helpers live with the module that owns them: `exhaust` beside the route code that needs it (or where the server keeps shared runtime helpers), and `isSubPath` in the media paths module. The package, its barrel, its dependency edge and its 19 unused exports are gone. The observable behaviour is unchanged.

**Key interfaces:**

- `exhaust` and `isSubPath` keep their behaviour at their new owner.
- The server's dependency on `@playliberty/utils` is removed.
- No workspace package declares `@playliberty/utils`.

**Acceptance criteria:**

- [x] `exhaust` and `isSubPath` are available at their new owner, and the four route registrars and the media module use them.
- [x] `packages/utils` is deleted and no package depends on `@playliberty/utils`.
- [x] The dead `debounce` (and its argument bug) is gone.
- [x] The observable behaviour is unchanged.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.
- [x] The dependency-cruiser and workspace checks still pass.

**Out of scope:**

- Any helper a future feature might want; reintroduce it where it is first needed.
- The other workspace packages.

## Observed

- Only `exhaust` (four route registrars) and `isSubPath` (media paths) are imported by any app.
- No `*.test.ts` under `packages/utils`.
- `debounce` spreads the arguments wrong and has no caller.

## Expected

The two used helpers move to their owner; the package is deleted.

## Outcome

Done. The two used helpers moved to their owners and the package is gone.

- `exhaust` lives at `apps/server/src/shared/exhaust.ts`; the four route registrars import it from there.
- `isSubPath` is a private helper in `apps/server/src/platform/media/mediaPaths.ts`, used by the sharded path builder.
- `packages/utils` is deleted, and no package declares `@playliberty/utils`; the edge is removed from `apps/server/package.json`, `tsconfig.depcruise.json`, and both `apps/server/Containerfile` stages.
- `debounce`, its argument-spreading bug, and the other 19 unused exports are gone.
- `docs/ARCHITECTURE.md` no longer lists the package.

The observable behaviour is unchanged: `exhaust` throws the same message and `isSubPath` keeps its containment rule. The media path tests (`mediaPaths.test.ts`) and the four route suites still pass.

Verification: `pnpm run build` and `pnpm run lint` clean; unit suites exit 0 (server 325, web 396, youtube 31, i18n 39, tokens 3, ui-foundation 6); `npx depcruise .` reports no violations (242 modules); `npx syncpack lint` and `node ./scripts/validate-tsconfig-paths.cjs` pass.

## Evidence

- `packages/utils/src/index.ts:1-41`; `packages/utils/src/utils/functions/debounce.ts:33-36`.
- Repo grep for `@playliberty/utils`: `apps/server` only, `exhaust` and `isSubPath`.
- Architecture review 2026-10-08, candidate 6.
