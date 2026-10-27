# 49: Clients for the library, the account and the Egress, and the old queries module goes

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

The library page, the account reads and the Egress page reach server state through their own clients, each owning its keys and invalidation, and the old queries module is deleted once no page imports it.

## Context

Architecture review, 2026-10-27, candidate 5, second half. Ticket 48 proves the client shape on the detail page and removes the largest consumer.

## Current state

- The library page imports six hooks by name, the router and the share dialog read the current account, and the Egress page imports three hooks.
- Every consumer names keys and invalidation rules that belong to its domain, and the old module keeps exports nobody reads once the detail has moved.

## Scope

- A library client: the gallery read, create, delete, pin, Sync all and the cover actions the dialogs use.
- An account client: the current account and the account directory. The router's admin guard and the share dialog cross it.
- An Egress client: the Egress read, Switch and Check.
- Delete the old queries module and the exports nobody reads. The endpoint table and the mock harness stay, as issue 60 requires.
- Tests: the library, share and Egress suites pass unchanged, and each key is named only by its client.

## Out of scope

- The mobile client and the E2E harness.
- The cache-effect vocabulary itself.
- The player store and the queue.

## Blocking edges

Blocked by 48. The contract can only land when the detail, the last large consumer, has moved.

## Verification

- No module imports the old queries module.
- Each page names no key; each domain owns its invalidation.
- The library, share and Egress suites pass unchanged.
- `pnpm --filter @playliberty/web test` passes; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-web-stack).
