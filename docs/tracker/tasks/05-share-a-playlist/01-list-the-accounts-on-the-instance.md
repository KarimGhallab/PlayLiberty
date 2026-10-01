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

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Any authenticated account lists every account on the instance, itself included, each with an id, a display name and an avatar URL.
- [ ] The payload carries no email address and no role anywhere, for any account.
- [ ] The list is ordered by display name and paged with the existing query, and the total is the instance's account count.
- [ ] An unauthenticated request is refused.
