# 42: Type-shape duplication

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

The type-shape restatements are gone. Removed eight assertions that only restated a compile-time type: the `typeof id === 'string'` and two `Object.keys(...).sort()` checks in `accountRoutes.test.ts:68,80`, the `typeof createdAt` and `Object.keys(...).sort()` checks in `shareRoutes.test.ts:146,175`, the `Object.keys(...).sort()` check in `trackRoutes.test.ts:245`, the two `toHaveProperty` calls in `playlistRoutes.test.ts:1323-1324`, and the fixture return-shape equality in `fixtures.test.ts:83`. Kept every `Schema.parse(response.json())` (the server-side response-shape contract), the raw-body absence checks (`@example.com`, `"email"`, `"role"`, `access`, `hasShares`), and the migration table and column assertions. Where a parse was left without its field assertion (the two raw-body privacy tests), it stays as a bare call, so the response shape is still validated.
