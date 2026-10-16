# 02: List and grant shares on a playlist

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `GET /playlists/:id/shares` and `POST /playlists/:id/shares` are now served by
`shareService`. The listing is owner-only, joins `share` to `account`, orders by display name with the rowid
tiebreak the directory uses, and maps the account through the accounts feature's own view, so a share carries
the account, the level and the created time. A playlist the caller does not own and one that does not exist are
the same `404`.

Granting is owner-only and an upsert: it writes the share with an `on conflict do update` aimed at the unique
playlist-and-account index, setting only the level, so a second grant changes the one share rather than adding a
second and the created time stays the first grant's. `.returning()` gives the row back without a second read. A
share to the owner is refused with `422` and code `self_share`; a target account that does not exist is refused
with `404` and code `account_not_found`; a playlist the caller does not own, or one that does not exist, is
`404`. The three `registerShareRoutes` now takes the context, the last registrar that did not, so every
registrar takes it and the buildApp comment about the context-free two is gone.

The eight new tests cover the owner listing a share with its account, level and time; both routes refusing a
read collaborator, a write collaborator and a stranger; a read grant making the playlist appear in the target's
library at read access; a write grant changing the level on the one share; the self-share and missing-account
refusals; a missing playlist; and the missing client header.

The delete route is still a `501` stub; ticket 03 owns it.

Verification: `pnpm run test` (185 server tests, 8 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` pass. No
migration, no em dashes. Not committed.
