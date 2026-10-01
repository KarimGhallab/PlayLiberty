# 02: List and grant shares on a playlist

**What to build:** An owner shares a playlist with someone in the household, and can see who has it.
`GET /playlists/:id/shares` answers the playlist's shares, each carrying the account, the level and when it was
created, to the owner alone. `POST /playlists/:id/shares` grants an account read or write. Granting to an
account that already has one changes that share's level rather than creating a second, which the unique
constraint on playlist and account makes well defined. Granting to yourself is refused, because it would be a
second path to access the owner already has; a target account that does not exist is refused, so a mistyped
choice is not lost silently; and a playlist the caller does not own, or one that does not exist, is the same
`404` every route in this feature gives. A grant takes effect at once: the target's library shows the playlist
at the level it was granted.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The owner lists the playlist's shares, each with the account, the level and the created time.
- [x] A read collaborator, a write collaborator and a stranger are each refused both routes with `404`.
- [x] Granting read to an account makes the playlist appear in that account's library with read access.
- [x] Granting write to an account that already holds read changes the level on the one share and produces one share, not two.
- [x] Granting a share to the account that owns the playlist is refused.
- [x] Granting a share to an account that does not exist is refused.
- [x] A playlist that is not the caller's, and one that does not exist, both answer `404`.
- [x] The mutating routes are refused without the client header.

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
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
