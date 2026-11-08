# 07: A constant key cannot be mis-called

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`accountsKey`, `currentAccountKey`, `egressKey`, `libraryKey` and `playlistPrefix` are now exported as `as const`
tuples and read `queryKey: libraryKey`. The six keys that carry an id stay functions. The keys module header now
states the real consequence: a function key hashes to `undefined`, not to `[]`.

The web's five clients and the mobile account read were repointed, and the session-cache guard uses the same
constants. A call such as `libraryKey()` no longer type-checks.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
