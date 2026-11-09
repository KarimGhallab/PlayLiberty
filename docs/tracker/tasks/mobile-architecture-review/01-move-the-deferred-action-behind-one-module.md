# 01: Move the deferred action behind one module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/library` exports the deferred action store with `PendingAction`, `DeferredWindow`, `DeferOptions` and `DeferredAction`. The store owns one timer per window, the refresh of the same action, the held window that waits for its surface, the optional grace and the commit. It has no React import.

The web hook subscribes to the shared store, and the web-local store and types are deleted. The mobile detail and gallery subscribe through one hook. The detail holds its window until its sheet leaves, keeps the 150 ms commit grace, and derives its hidden track from the window plus the in-flight removal. The gallery derives its hidden playlists from its windows plus the in-flight delete, and it commits its previous window when a second delete starts.

Verification: `pnpm run build`, `pnpm run lint:check`, `pnpm run test:unit` (web 616, mobile 600, library 35, and the other packages), and a real-timer smoke that showed a started window commit at 30 ms while a held one waited for `startAll`. The gallery then gained its second-delete test, so the mobile suite is 601.

See [`mobile-architecture-review`](TICKETS.md).
