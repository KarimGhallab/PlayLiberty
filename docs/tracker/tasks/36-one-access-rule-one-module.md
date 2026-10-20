# 36: One access rule, one module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/access/rule.ts` owns the rule. One `GRANTED` table lists, per need, the resolved levels that satisfy it; `satisfies` reads it, `shareLevelsFor` returns its share half for SQL, and `ownerGrants` returns whether ownership alone suffices. `AccessNeed` moves there, re-exported from `entry.ts` so every feature keeps naming the need from the seam it enters.

The shapes derive from it. `playlistReaches(accountId, need)` is the one access condition: ownership when the need grants it, or a share at a level the need accepts. `playlistVisibleTo` calls it for read and keeps its page call site. `trackAccess.ts` drops its two hand-written SQL constants and asks the same builder for read and write through one `trackAllowed`. The audience resolver filters its share join by `shareLevelsFor(Read)` and includes the owner per `ownerGrants(Read)`, keeping its call site. The single and batch resolvers keep resolving the level; they no longer enumerate levels, so a new one flows through and the seam's `satisfies` decides.

`entry.test.ts` replaces the four piecemeal playlist-seam tests with one table: owner, write, read and stranger against read, write and owner, asserting both the outcome and that the handler does not run on a denial. A new share level is one edit to `GRANTED` (plus the contract enum), not four SQL statements.

Verification: the table test passes; `pnpm run build` and `pnpm run lint` pass; the server suite is 386 passed across 28 files. No feature imports `satisfies`, `shareLevelsFor`, `ownerGrants`, `playlistReaches` or a raw track predicate.

## Objective

The owner-or-share rule is stated once in `shared/access/`, and the single, batch, page, audience and track query shapes are its implementation.

## Context

Issue 65 made the entry seam the only door, but the rule itself is still written six ways: the single SQL, the batch SQL, the Drizzle fragment for the page, the audience join, the track read SQL and the track write SQL. A new share level has to be found in all of them. The seam's `satisfies` is one more statement.

Architecture review 2026-10-19, candidate 2.

## Scope

- One predicate states what read, write and owner mean for a resolved level.
- The single, batch, page, audience and track shapes call or derive from it. They may keep separate SQL for performance, but none restates the condition.
- Track read and track write access derive from the same rule.
- The page fragment and the audience resolver keep their current call sites.
- A 404 for an unreachable playlist and a 403 for an unreachable track stay as they are.

## Out of scope

Adding a share level, an admin override, the entry seam's shape, audit lines, and the audience grouping (issue 33 is resolved).

## Blocking edges

None. Can start immediately.

## Verification

- A table test covers owner, write, read and stranger against read, write and owner needs.
- A new share level would require one edit in the access module, not four statements.
- No feature imports a raw predicate.
- `pnpm run build`, `pnpm run lint` and the server suite pass.
