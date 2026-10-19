# One access rule, one module

Status: open
Labels: `enhancement`, `ready-for-agent`

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
