# 02: The console reads the pool behind the admin gate

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-country-lookup-is-one-module.md)

## What to build

An admin opens the existing `/egress` route from the library header's door and reads the instance's pool. The route
reads the caller's account first: an admin gets the console, everyone else gets the not-found body with its way home,
and the pool read is not issued for them.

The console reports the agent as reachable or down, draws loading while the pool read is in flight, a read failure
with a retry, and an empty pool as its own sentence. Each exit is a card with its name, endpoint, status word and
tone, last attempted date, the country word beside its flag, and the active mark. The screen pulls to refresh and
re-reads the pool. The cards carry no action yet; `03` adds them.

## Acceptance criteria

- [ ] An admin sees the pool and a non-admin sees the not-found body, with no pool read issued for the non-admin.
- [ ] Loading, read failure with retry, and empty states are drawn.
- [ ] Each card names the exit, its endpoint, status word, last attempt and country, and the active exit is marked.
- [ ] The agent line reads reachable or down from the pool read.
- [ ] Pulling down re-reads the pool.
- [ ] The screen has no rotation control, history, chart or timer.

## Verification

The mobile gate and console suites pass, `pnpm --filter @playliberty/mobile run typecheck` passes, and a device check
shows the pool as an admin and the not-found body as a non-admin.
