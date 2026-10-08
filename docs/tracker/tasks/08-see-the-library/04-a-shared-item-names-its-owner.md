# 04: A shared item names its owner

**Blocked by:** [`01`](01-the-list-and-the-item.md).
**Status:** resolved

## Outcome

Implemented and verified. The line is `Shared by <name>`, its own row under the sync line, drawn only for a playlist that is not the account's.

`queries.ts` gained `useAccountDirectory`, which reads `GET /accounts` with `AccountSummarySchema` and `select`s the page down to its items, and `ownerNameFrom`, a pure function that resolves an owner id to a display name or null. There is no new server route: the directory and the summary schema already exist from `05-share-a-playlist`. The read is one page at the API's default, which is the spec's own limit rather than a new one.

`PlaylistHeader` gained an optional `ownerName`. It draws the line when the name resolves and the playlist's `access` is not `owner`; on the account's own playlist it draws nothing even when a name is passed, because `access` already says the item is theirs and a "shared by yourself" line would be a sentence about the reader. A null name draws nothing at all rather than a placeholder, and the share indicator beside the name is the fallback. `LibraryPage` reads the directory, builds the lookup once per render, and passes each item its resolved owner; the directory being pending, failed, or short of the owner all resolve to null and leave the item on its indicator, so the line never blocks the list and never invents a name.

Tests: three in `queries.test.ts` (resolved id, unknown id returns null, empty directory returns null rather than an empty name); three added to `PlaylistHeader.test.tsx` (a shared item names its owner, an owned item draws no line even with a name passed, a missing owner leaves the indicator alone); three added to `LibraryPage.test.tsx` (the owner line from the directory read, the fallback when the directory does not carry the owner, and a revoked playlist dropping on the next list read while the owned item is unchanged). The revocation case drives a real second read through the create's invalidation: the first read carries two playlists, the second carries the owned one alone, and the assertion is that exactly one listitem remains.

The design record and the specimen had recorded the opposite decision, that the item carries the indicator alone because nothing could supply the name. That was true when written; the directory retires it. `docs/design-system/screens/library.md` now records the line, and the library specimen draws `Shared by Ada` and `Shared by Grace` on its two collaborator items under a new `.owner` rule in `specimen.css`, scoped to a header the way `.state` is so the track row cannot inherit it.

Verification: `pnpm run test` (215 server, 12 youtube, 14 ui-foundation, 3 tokens, 54 web), `pnpm run build`, `pnpm run lint`, `npx depcruise .` (132 modules, 0 violations), `npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` all pass. Verified in Chrome that an owned item draws no line and that both `GET /playlists` and `GET /accounts` are issued. No em dashes. Not committed.
