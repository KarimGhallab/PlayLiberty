# 42: Type-shape duplication

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Server tests restate compile-time types at runtime: sorted key lists, `typeof` checks and `toHaveProperty` calls that a schema parse already guarantees.

**Current behavior:**
`accountRoutes.test.ts`, `shareRoutes.test.ts`, `trackRoutes.test.ts` and `playlistRoutes.test.ts` assert `Object.keys(...).sort()` key sets, `typeof x === 'string'` and `toHaveProperty('thumbnailPath')`. Every response is already parsed against its contract schema, and the schemas are plain `z.object` with no passthrough, so the parsed object cannot carry an extra key and the key-set assertion can never fail independently.

**Desired behavior:**
The type-shape restatements in the Cut table are removed. The schema parse that validates the HTTP response shape stays, and the raw-body absence checks that actually catch a leaked field stay.

**Acceptance criteria:**

- [x] The Cut assertions are removed.
- [x] The schema parses and the raw-body privacy checks stay.
- [x] The server suite passes.
- [x] `pnpm run build` and `pnpm run lint` pass.

**Out of scope:**

- The web, package and e2e suites; those are issues 40, 41 and 45.
- Multi-layer redundancy; that is issue 44.

## Manifest

### Cut

| File:line                     | Test                                                                                  | Asserted                                                                       | Owner                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `accountRoutes.test.ts:68`    | lists every account with an id, a display name and an avatar, the caller included     | `every(item => typeof item.id === 'string')`                                   | `:64` `DirectoryPageSchema.parse`                                                 |
| `accountRoutes.test.ts:80`    | carries no email address and no role anywhere                                         | `Object.keys(item).sort()` equals `['avatarUrl','displayName','id']`           | `:87-90` raw-body `not.toContain`                                                 |
| `shareRoutes.test.ts:146`     | lists the shares to the owner with the account, the level and the time                | `typeof listed[0]?.createdAt === 'string'`                                     | `:141` `ShareListSchema.parse`                                                    |
| `shareRoutes.test.ts:175`     | names the collaborator with no email address and no role                              | `Object.keys(share?.account).sort()` equals `['avatarUrl','displayName','id']` | `:167-174` raw-body `not.toContain` plus parse                                    |
| `trackRoutes.test.ts:245`     | reports a refusal per playlist while the writable playlists in the same batch succeed | `Object.keys(result.results[1]).sort()` equals `['outcome','playlistId']`      | `:235` parse plus `:249` outcome equality                                         |
| `playlistRoutes.test.ts:1323` | returns a null thumbnail and a null duration as nulls, not absent keys                | `toHaveProperty('thumbnailPath')`                                              | `:1313` parse, `:1325` `toBeNull()`                                               |
| `playlistRoutes.test.ts:1324` | same                                                                                  | `toHaveProperty('durationSeconds')`                                            | `:1313` parse, `:1326` `toBeNull()`                                               |
| `fixtures.test.ts:83`         | takes the display name, role, email and pangolin id                                   | `account` equals `{accountId, pangolinUserId, displayName}`                    | the `SeededAccount` interface; sibling `:88-89` prove role and email reach the DB |

The last row is fixture infrastructure, not a user boundary: it restates the `SeededAccount` return type. Recommended cut for consistency, but it is the one row here that is defensible to keep.

### Keep (reviewed, no change)

- The raw-body absence checks: `accountRoutes.test.ts:88-90`, `shareRoutes.test.ts:169-171` (no email, role) and `playlistRoutes.test.ts:690-691` (no `access`, no `hasShares`). These catch a leaked field that the parse cannot.
- The migration result assertions: `migrate.test.ts:55` (tables) and `:66-73` (columns). They pin what a migration produces, which the type system never sees.
- Every `Schema.parse(response.json())`: it validates the server actually returns the contract shape, which the compile-time type does not guarantee. Including `syncRunRoutes.test.ts:60` and `shareAccess.test.ts:255`.

## Observed

- The Cut table above, catalogued from the server suite on 2026-10-08.

## Expected

The type-shape restatements are gone; the parse and the privacy checks stay.

## Outcome

Done. The type-shape restatements are gone.

- Removed eight assertions that only restated a compile-time type: the `typeof id === 'string'` and two `Object.keys(...).sort()` checks in `accountRoutes.test.ts:68,80`, the `typeof createdAt` and `Object.keys(...).sort()` checks in `shareRoutes.test.ts:146,175`, the `Object.keys(...).sort()` check in `trackRoutes.test.ts:245`, the two `toHaveProperty` calls in `playlistRoutes.test.ts:1323-1324`, and the fixture return-shape equality in `fixtures.test.ts:83`.
- Kept every `Schema.parse(response.json())` (the server-side response-shape contract), the raw-body absence checks (`@example.com`, `"email"`, `"role"`, `access`, `hasShares`), and the migration table and column assertions.
- Where a parse was left without its field assertion (the two raw-body privacy tests), it stays as a bare call, so the response shape is still validated.

Verification: the server suite passes (27 files, 344 tests; assertions removed, no test blocks). `pnpm run build` and `pnpm run lint` are clean.

## Evidence

- Test pruning review 2026-10-08 (issue 42 manifest, explore pass over `apps/server/src`).
