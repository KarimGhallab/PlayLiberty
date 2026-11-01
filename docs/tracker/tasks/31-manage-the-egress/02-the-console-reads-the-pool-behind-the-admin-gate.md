# 02: The console reads the pool behind the admin gate

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-country-lookup-is-one-module.md)

## Outcome

The `/egress` route now renders a gate. The gate reads the session and the caller's account: an admin gets the
console, and a signed-out or non-admin caller gets the not-found body with its way home. The console is not mounted
for anyone else, so the pool read is never issued for them.

`useEgress` reads the pool under the shared egress key. The console draws the agent as reachable or down, the loading
sentence while the read is in flight, the read failure with its retry, and the empty pool as its own sentence. Each
exit is a card with its name, endpoint, status word and tone, last attempt, country word with its flag, and the
active mark. The pool pulls to refresh. The cards carry no action yet.

The country word uses the shared lookup. Hermes has no `Intl.DisplayNames`, so the card falls back to the country code
(`FR`), the same fallback the web's accessible name keeps; the web keeps the localized name where the API exists.

## Verification

- Mobile: 464 tests across 51 suites, adding six console cases and three gate cases. The console covers the card
  facts, the country code fallback, both agent states, loading, the read failure with retry, and the empty pool with a
  pull to refresh. The gate covers an admin, a normal account with no pool read, and a signed-out caller.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554`, an admin saw the pool with the agent down, every card's endpoint, status, last attempt and
  country, and the active mark on `01-FR-634`. As a normal account, the header door was absent and opening
  `dev.playliberty.app://egress` answered the French not-found body.

See [`31-manage-the-egress`](../../specs/31-manage-the-egress.md).
