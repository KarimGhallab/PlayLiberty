# 01: List the accounts on the instance

**What to build:** An owner needs a list of people to share a playlist with, and the list has to be the
smallest thing a picker can be drawn from. `GET /accounts` answers a page of the instance's accounts, ordered
by display name, each with an id, a display name and an avatar URL and nothing else: no email address and no
role, because a picker does not need them and one account's address is not another's to read. Any
authenticated account may read it, because any account may be handed a share and any owner needs something to
choose from, and the list holds the caller in the same shape as everyone else. It is paged with the existing
page query, and it adds the narrow account view to the contracts rather than reusing the wider one that
`GET /me` answers with.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] Any authenticated account lists every account on the instance, itself included, each with an id, a display name and an avatar URL.
- [x] The payload carries no email address and no role anywhere, for any account.
- [x] The list is ordered by display name and paged with the existing query, and the total is the instance's account count.
- [x] An unauthenticated request is refused.

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
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
