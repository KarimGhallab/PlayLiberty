# 02: Sign out hands the phone over, in your language

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

Sign out is one call from the root. `useSession` exposes `signOut` over the session store's `expire`, which clears
the token and marks the app signed out; the library route no longer touches the token store, so the handover cannot
forget one of its two halves.

The cache clear moved to its own owner. `SessionCache` sits inside the query provider and clears the whole cache when
the session becomes signed out, so the rule is one rule for both paths: sign-out and a refused credential. No read
outlives the session that made it, and neither path issues a request. The guard is tested at its seam: a seeded
cache is dropped when the status flips to signed out and kept while the session holds.

The language binding gained the seam it was missing. `packages/i18n` now owns a `createLanguageController` that
resolves the language once, writes the storage port on a change, tells the client's chrome, and notifies its
subscribers. `I18nProvider` is a thin binding over it through `useSyncExternalStore`.

**Constraints:** A refused credential clears the cache as a sign-out does, because the guard keys on the session status.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
