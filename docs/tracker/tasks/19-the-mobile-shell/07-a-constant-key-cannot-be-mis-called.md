# 07: A constant key cannot be mis-called

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-one-owner-for-the-invalidation-map.md)

## Observed

`@playliberty/query` exported the five parameterless keys as functions, for one call syntax with the six keys that
carry an id. A function passed as a value instead of called hashes to `undefined`, so every query shares one cache
entry. That mistake reached four call sites while the package landed: the suite caught two and the type check two.

## Expected

A key with no parameter is a constant, so the wrong use is impossible rather than merely detectable.

## Outcome

`accountsKey`, `currentAccountKey`, `egressKey`, `libraryKey` and `playlistPrefix` are now exported as `as const`
tuples and read `queryKey: libraryKey`. The six keys that carry an id stay functions. The keys module header now
states the real consequence: a function key hashes to `undefined`, not to `[]`.

The web's five clients and the mobile account read were repointed, and the session-cache guard uses the same
constants. A call such as `libraryKey()` no longer type-checks.

## Verification

- Query 10, web 638, mobile 38, i18n 42, all green.
- `pnpm run build` and `pnpm run lint:check` pass, and `depcruise` reports no violation over 428 modules.
- No parameterless key is called anywhere: the type check rejects it.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
