# 10: Reduce Motion is the default until the system answers

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

`useReduceMotion` starts `false` and reads the system preference asynchronously, so a motion-sensitive user can see
the first mount animate before the preference resolves.

## Expected

The hook fails safe: no motion until the system reports that motion is allowed, or the preference is read before the
first paint.

## Evidence

- `apps/mobile/src/shared/a11y/useReduceMotion.ts`: `useState(false)` and the async read.

## Acceptance criteria

- [x] The initial value is `true`, or the preference is available before the first paint.
- [x] Components that read the hook do not animate on the first mount when reduce motion is on.
- [x] A test asserts the initial value.

## Outcome

`useReduceMotion` starts `true` and keeps the system's answer in a module cache, so a screen mounted after the first
read starts with the truth instead of the safe default. The first mount never animates before the system answers; a
later mount does not wait.

The hook test holds the read pending and asserts the first value is on, then resolves it false and asserts a later
mount starts off without a new answer. The account sheet's own reduce-motion test still sees the cut.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass.
