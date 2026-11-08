# 02: The console reads the pool behind the admin gate

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`31-manage-the-egress`](../../specs/31-manage-the-egress.md).
