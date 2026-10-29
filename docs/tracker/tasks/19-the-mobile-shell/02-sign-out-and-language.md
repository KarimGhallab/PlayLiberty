# 02: Sign out hands the phone over, in your language

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-sheet-names-you.md)

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
subscribers. `I18nProvider` is a thin binding over it through `useSyncExternalStore`. The package tests cover the
resolution order, the port write, the injected write and the subscription, and the web's suite passes untouched,
which is the proof the seam did not move the web's behaviour.

## Verification

- Mobile 38 tests across 9 suites, i18n 42, web 648, all green.
- `pnpm run build` and `pnpm run lint:check` pass.
- On `emulator-5554`: the sheet switched to French in place (`Compte`, `Langue`, `Se déconnecter`, `Fermer`), Sign
  out returned to the French signed-out state with its single `Se connecter` action, a force-stop and relaunch
  still drew French, and signing back in returned to the library in French. The language was set back to English
  afterwards.

## Notes

- The refused-credential path clears the cache too, because the guard keys on the session status rather than on the
  button. That is deliberate: a `401` ends the session just as a sign-out does.
- `applyLanguage` is read once when the provider mounts. Nothing passes it today, and the web suite proves the
  default document write still happens on a change.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
