# 04: A shared item names its owner

**Status:** resolved

## Outcome

The line is `Shared by <name>`, its own row under the sync line, drawn only for a playlist that is not the account's. `queries.ts` gained `useAccountDirectory`, which reads `GET /accounts` with `AccountSummarySchema` and selects one page of items at the API's default, plus `ownerNameFrom`, a pure function resolving an owner id to a display name or null; no new server route was added. `PlaylistHeader` gained an optional `ownerName` and draws the line when the name resolves and the playlist's `access` is not `owner`, and a null name draws nothing rather than a placeholder, leaving the share indicator beside the name as the fallback. `LibraryPage` reads the directory once per render and passes each item its resolved owner, with a pending, failed or short directory all resolving to null, drawn under a new `.owner` rule scoped to a header the way `.state` is.

See [`08-see-the-library`](../../specs/08-see-the-library.md).
