# 48: One optimistic frame, and a Playlist client for the detail

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

Server state reaches the detail page through one Playlist client that owns its keys, its invalidation and its optimistic frame. The page names no key, and the optimistic frame exists once.

## Context

Architecture review, 2026-10-27, candidate 5, first half. Issue 19 gave the client one cache-effect map and issue 60 gave both sides one endpoint table; this ticket gives each domain its own client. See [`ARCHITECTURE.md`](../../ARCHITECTURE.md#the-web-stack).

## Current state

- The web's server state is one module of 780 lines: 28 hooks, 5 interfaces and 4 helpers. The detail page imports 14 hooks by name.
- The cache-effect module says it is the one place a key is written, yet the Playlist key is written in six hooks and read directly by the play transition.
- The optimistic frame (cancel, snapshot, apply, restore, invalidate) is pasted in three mutations.

## Scope

- One optimistic patch helper: cancel, snapshot, apply, restore on failure. The three optimistic mutations use it.
- A Playlist client for the detail: the Playlist read, the Track list and queue, settings, cover, shares, Sync and Track actions, with their keys and change effects. The page and the play transition stop naming a key.
- Optimistic behaviour is unchanged: a control moves on the press and restores when the write fails.
- Tests: each mutation's invalidation, and the detail suite unchanged.

## Out of scope

- The library, the account and the Egress; ticket 49.
- The live event stream, which keeps invalidating through the same change effects.
- The page's derived view model.

## Blocking edges

None. Can start immediately.

## Verification

- No detail module imports a query key or a raw read hook.
- The optimistic frame is written once.
- The detail page suite passes unchanged.
- `pnpm --filter @playliberty/web test` passes; `pnpm run build` and `pnpm run lint:check` pass.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#the-web-stack).
