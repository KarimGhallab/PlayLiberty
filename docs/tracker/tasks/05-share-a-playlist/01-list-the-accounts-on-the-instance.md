# 01: List the accounts on the instance

**Status:** resolved

## Outcome

Implemented and verified. `GET /accounts` answers a page of the instance's accounts through `listAccountSummaries`, ordered by display name with the rowid tiebreak the playlist list route carries, so two accounts sharing a display name cannot swap between pages. The read selects only the id, the display name and the avatar URL, so an email address and a role are not fetched and cannot leak; any authenticated account may read it, and the list holds the caller in the same shape as everyone else. The contracts gained `AccountSummarySchema`, the narrow directory view, beside the wider `AccountSchema` that `GET /me` still serves, and `registerAccountRoutes` now takes the context because it reads the database. The four new tests cover the listing with the caller included, a three-key payload with no email and no role anywhere, display-name order with paging and the true total, and the unauthenticated refusal.

See [`05-share-a-playlist`](../../specs/05-share-a-playlist.md).
