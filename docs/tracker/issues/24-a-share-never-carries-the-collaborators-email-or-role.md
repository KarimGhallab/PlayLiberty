# 24: A share never carries the collaborator's email or role

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

Done. A share names the collaborator with the summary shape only.

- `ShareSchema.account` is now `AccountSummarySchema` (id, displayName, avatarUrl); it was the wide `AccountSchema`.
- `toAccountSummary` was added beside `toAccountView`, and `toShareView` uses it. `/me` keeps the wide `Account`.
- The web share dialog reads only `accountId` and `level`, so the narrowing is transparent; its mock was trimmed to match the server.
- A test seeds a collaborator with an email and the admin role and asserts the raw grant and list bodies carry neither field, the counterpart of the directory's test.

Verification: full unit suite exit 0 (tokens 3, youtube 22, i18n 39, ui-foundation 6, server 282, web 372); `pnpm run build` and `pnpm run lint` clean.
