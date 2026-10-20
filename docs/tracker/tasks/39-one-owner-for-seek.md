# One owner for seek

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`SeekDirection` is the one intent: the store's `seekBy` (the keyboard's 5 seconds), `seekByPage` (the Media Session's 10 seconds), `seekToFraction`, `seekToStart` and `seekToEnd` all write through one `seekPatch`, which owns the current track's bound and the `seekTo` mailbox. The fraction is clamped in the store, so the bar sends the pointer's fraction against its own box and no longer multiplies by the duration; Home and End name `seekToStart` and `seekToEnd`. `PlayerAudio` asks `shouldApplySeek` (the store's 0.5 second tolerance) before writing `currentTime`, and the Media Session handlers call `seekByPage` at press time, so their effect binds once rather than on every position update.

The resume target stays the audio element's: it is applied on `loadedmetadata`, not on a seek request, and moving it into the seek mailbox would make a user seek wait for metadata too.

Verification: `pnpm --filter @playliberty/web test` is 504 passed (50 files); `pnpm run build` and `pnpm run lint` pass; `pnpm test:e2e` is 35 passed.

See [the web stack](../../ARCHITECTURE.md#the-web-stack).
