# 46: One responder for a refusal, across the Playlist and Track endpoints

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

A refusal is answered in one place: a handler produces an outcome, one responder maps it to the problem document, and the Playlist and Track endpoints are the first to use it. A denial and a vanished Playlist stay indistinguishable.

## Context

Architecture review, 2026-10-27, candidate 3. The access rule itself is already centralised (issues 22, 36, 65); this ticket centralises what a refusal answers. See [`ARCHITECTURE.md`](../../ARCHITECTURE.md#layer-boundaries-normative).

## Current state

- The entry seam returns Granted or Denied; each module then re-encodes a denial into its own outcome type. The server carries fifteen outcome types for the same decision.
- Each route chooses the not-found reason at the call site, and the Playlist routes repeat the frame parse, call, not-found, ok, exhaust nine times.
- A refusal's copy, status and problem code are therefore authored per endpoint.

## Scope

- One responder in the shared layer: an outcome declares its reply (status, problem code, detail), or one table maps the outcome and the need to a problem. The route registrar renders it; a handler may still send a body directly.
- The Playlist endpoints cross it first, then the Track endpoints. The modules keep their decisions; the routes stop authoring refusals.
- Every status, problem code and response shape is unchanged. A denied Playlist and a Playlist that does not exist answer the same not-found.
- The batch add keeps its per-item `refused`, which is a result item, not a refusal document.

## Out of scope

- The cover, share and Sync endpoints; ticket 47.
- The Egress routes: an unreachable agent answers a 200 body with the last known pool, not a refusal.
- What owner, write and read mean.

## Blocking edges

None. Can start immediately.

## Verification

- Each migrated route's refusal is byte-identical to today's problem document.
- No migrated route chooses a not-found reason by hand.
- The existing Playlist and Track route suites pass unchanged.
- `pnpm --filter @playliberty/server test` passes; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#layer-boundaries-normative).
