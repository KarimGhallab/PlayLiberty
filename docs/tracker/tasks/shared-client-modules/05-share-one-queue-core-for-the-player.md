# 05: Share one queue core for the player

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-scaffold-the-shared-client-packages.md).

## Observed

Both player stores are about 500 lines. They repeat the shuffle with a leader hoisted, the random draw, the merge by id, the seek clamp and the five-second grace before `Previous` restarts. The comments are copied too.

They disagree on a seek with no duration. Web refuses it. Mobile applies the offset without a bound. The queue order and the playable rule also exist in each client.

## Expected

`@playliberty/player` owns the pure queue rules: the playable check, the queue order, the shuffle, the random draw, the merge by id, the seek patch and the grace before Previous. Both stores keep only their own state shape and call the package.

A seek with no duration is refused on both clients. The seek needs a duration to bound it, and a guess would move the element to an unknown place.

## Evidence

- Web store: 511 lines. Mobile store: 522 lines.
- The shuffle, the random draw, the merge and the seek clamp carry the same body on both sides.
- Web returns `null` for a seek with no duration. Mobile returns `Math.max(0, seconds)`.
- `queueOrder` is 38 lines on web and 34 on mobile, with the same three-phase algorithm.
- `playable` is 20 lines on web and 7 on mobile, which is a subset.

## Acceptance criteria

- [ ] `player` owns the playable rule, the queue order, the shuffle, the random draw, the merge, the seek patch and the grace rule.
- [ ] The package imports no React, no Zustand and no platform module.
- [ ] Both stores call the package and keep their own state shape.
- [ ] A seek with no duration is refused on both clients.
- [ ] A shuffled refetch keeps the current order for known ids, appends new ids in the server order and drops a missing id.
- [ ] The two local queue-order and playable copies are deleted.

## Verification

The package suite covers the shuffle with a leader, the merge, the seek clamp at both ends, a seek with no duration, and the grace boundary at five seconds. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
