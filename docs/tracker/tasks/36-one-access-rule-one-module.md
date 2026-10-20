# 36: One access rule, one module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/access/rule.ts` owns the rule. One `GRANTED` table lists, per need, the resolved levels that satisfy it; `satisfies` reads it, `shareLevelsFor` returns its share half for SQL, and `ownerGrants` returns whether ownership alone suffices. `AccessNeed` moves there, re-exported from `entry.ts` so every feature keeps naming the need from the seam it enters.

The shapes derive from it. `playlistReaches(accountId, need)` is the one access condition: ownership when the need grants it, or a share at a level the need accepts. `playlistVisibleTo` calls it for read and keeps its page call site. `trackAccess.ts` drops its two hand-written SQL constants and asks the same builder for read and write through one `trackAllowed`. The audience resolver filters its share join by `shareLevelsFor(Read)` and includes the owner per `ownerGrants(Read)`, keeping its call site. The single and batch resolvers keep resolving the level; they no longer enumerate levels, so a new one flows through and the seam's `satisfies` decides.

`entry.test.ts` replaces the four piecemeal playlist-seam tests with one table: owner, write, read and stranger against read, write and owner, asserting both the outcome and that the handler does not run on a denial. A new share level is one edit to `GRANTED` (plus the contract enum), not four SQL statements.

Verification: the table test passes; `pnpm run build` and `pnpm run lint` pass; the server suite is 386 passed across 28 files. No feature imports `satisfies`, `shareLevelsFor`, `ownerGrants`, `playlistReaches` or a raw track predicate.

See [ARCHITECTURE.md](../../ARCHITECTURE.md).
