# 24: A share never carries the collaborator's email or role

**State:** `ready-for-agent`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The share read and the grant response describe the other account with the wide `Account`, so any authenticated account can read another account's email and whether it is an admin.

**Current behavior:**
`toShareView` maps a share's account through `toAccountView`, which returns `email` and `role`. `ShareSchema.account` is the wide `AccountSchema`. The account directory deliberately uses the narrow `AccountSummarySchema` (id, displayName, avatarUrl) for exactly this reason and its test asserts no email. The share view has no such assertion and its fixtures seed a null email, so the exposure is untested.

**Desired behavior:**
A share names the other account with the summary shape only: id, displayName, avatarUrl. The share read and the grant response carry no email and no role. The contract's share account is `AccountSummarySchema`, and the server maps through it.

**Key interfaces:**

- `ShareSchema.account` in `packages/contracts`.
- `toShareView` and `toAccountView` in the shares and accounts services.
- The web client parses shares with `ShareListSchema` / `ShareSchema`; it reads only `accountId` and `level`, so the narrowing is transparent to the dialog. Check the test fixtures that build `Share` objects.
- `/me` and `/accounts` keep their current shapes.

**Acceptance criteria:**

- [ ] The share read returns no `email` and no `role` for any collaborator.
- [ ] The grant response does the same.
- [ ] A test asserts the fields are absent, the counterpart of the account directory's test.
- [ ] The web client compiles and its share dialog tests pass.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Removing `AccountSchema`, which `/me` still uses.
- The account directory's own shape, already narrow.

## Evidence

- `packages/contracts/src/schemas.ts:98-103` and `:19-37`.
- `apps/server/src/features/shares/shareService.ts:22-28`.
- `apps/server/src/features/accounts/accountService.ts:93-101`.
- `apps/server/src/features/shares/routes/shareRoutes.ts:29-50, 99-102`.
- Security review 2026-10-08, finding 2.
