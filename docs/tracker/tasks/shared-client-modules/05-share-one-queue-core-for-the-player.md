# 05: Share one queue core for the player

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/player` now exports the queue core: `randomItem`, `shuffleIds` and `shuffleWithLeader`, `mergeIds` and `mergeById`, `orderTracksByQueue`, `seekPatch` and `seekFractionPatch`, and `PREVIOUS_GRACE_SECONDS` with `previousMove`.

The web store keeps `PlayerTrack[]` and passes an id accessor to the generic shuffle and merge; the mobile store keeps id arrays and the track map, and calls the id helpers. Both call the shared seek patch, so a target with no duration is refused instead of applied unbounded. `skipPrevious` takes the shared grace rule at the five-second boundary.

The two local `queueOrder` copies and their tests are gone; the package suite owns the group ordering, the leader shuffle, the merge, both seek clamps and the grace boundary. The local shuffle, draw, merge and seek copies in both stores are gone.
