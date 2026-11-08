# 10: Reduce Motion is the default until the system answers

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

`useReduceMotion` starts `true` and keeps the system's answer in a module cache, so a screen mounted after the first
read starts with the truth instead of the safe default. The first mount never animates before the system answers; a
later mount does not wait.

The hook test holds the read pending and asserts the first value is on, then resolves it false and asserts a later
mount starts off without a new answer. The account sheet's own reduce-motion test still sees the cut.
