# 47: The remaining refusals cross the responder, and the old outcomes go

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

The cover, share and Sync endpoints answer refusals through the one responder, and the per-module outcome types no caller renders are deleted, so a refusal reason is named in one table.

## Context

Architecture review, 2026-10-27, candidate 3, second half. Ticket 46 settles the responder's shape with the Playlist and Track endpoints.

## Current state

- The cover, share and Sync modules each carry their own outcome type (cover outcome, grant and revoke outcomes, start-sync and sync-run outcomes) and their routes choose the refusal reply per call site.
- The same decision (denied, vanished, refused) is named differently in each module, so a new reason touches every group.

## Scope

- The cover, share and Sync endpoints cross the responder.
- Delete the outcome types the responder replaced. Keep those that still name an internal decision, such as the batch add's per-item result and a Track transition.
- Every status, problem code and response shape is unchanged.
- Tests: one refusal per group, including a denied share grant and a sync on a Playlist the account cannot write.

## Out of scope

- The Egress routes, whose unreachable answer is a 200 body, not a refusal.
- The access rule and the audit lines.
- New endpoints.

## Blocking edges

Blocked by 46. The responder and its first two groups settle the shape before the remaining groups move.

## Verification

- A new refusal reason edits one table, not one module per group.
- No route file chooses a not-found reason by hand or imports a not-found helper directly.
- The existing cover, share and Sync suites pass unchanged.
- `pnpm --filter @playliberty/server test` passes; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#layer-boundaries-normative).
