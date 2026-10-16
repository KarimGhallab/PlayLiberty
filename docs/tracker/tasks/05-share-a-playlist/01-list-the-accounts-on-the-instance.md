# 01: List the accounts on the instance

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `GET /accounts` answers a page of the instance's accounts through
`listAccountSummaries`, ordered by display name with the rowid tiebreak the playlist list route carries, so two
accounts sharing a display name cannot swap between pages. The read selects only the id, the display name and
the avatar URL, so an email address and a role are not fetched and cannot leak. Any authenticated account may
read it, and the list holds the caller in the same shape as everyone else.

The contracts gained `AccountSummarySchema`, the narrow directory view, beside the wider `AccountSchema` that
`GET /me` still serves. `registerAccountRoutes` now takes the context because it reads the database, and the
buildApp comment about the context-free registrars was narrowed to the share registrar, which is the last one
without it.

The four new tests cover the listing with the caller included, a three-key payload with no email and no role
anywhere, display-name order with paging and the true total, and the unauthenticated refusal. Accounts are
provisioned through the identity hook rather than seeded, so the directory lists rows the app really made.

Verification: `pnpm run test` (177 server tests, 4 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` pass. No
migration, no em dashes. Not committed.
