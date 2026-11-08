# 37: One playable rule

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`shared/player/playable/playable.ts` is the one rule. `isPlayable(track)` answers from a track's `fileStatus`; `hasPlayableTrack({ counts })` answers from the whole-playlist counts. The queue build filters with `isPlayable`, `TrackRow` derives its play affordance from it, and the detail header and the gallery item read `hasPlayableTrack`. The private predicate in `playerQueue.ts` and the inline `fileStatus === Stored` in `TrackRow` are gone.

The `hasPlayableTrack` cases leave `playerQueue.test.ts`; `playable.test.ts` covers both readers with the two agreement tests: a stored track and a counts map with a stored entry both answer true, and every non-stored status against a counts map holding no stored entry both answer false.

See [ARCHITECTURE.md](../../ARCHITECTURE.md).
