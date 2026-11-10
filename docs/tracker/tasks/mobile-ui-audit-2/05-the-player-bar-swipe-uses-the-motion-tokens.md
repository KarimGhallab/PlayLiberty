# 05: The player bar swipe uses the motion tokens

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The swipe's completion reads `swipeMotion`, which takes `tokenDuration('motion-slow')` and the shared
`standardEasingBezier`. The 260ms literal and the custom bezier are gone; the 26% threshold, the neighbour preview and
the spring settle are untouched. A unit test pins both values, and the emulator swipe moved the queue from 1/67 to
2/67.
