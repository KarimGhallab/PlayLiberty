# One owner for seek

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`SeekDirection` is the one intent: the store's `seekBy` (the keyboard's 5 seconds), `seekByPage` (the Media Session's 10 seconds), `seekToFraction`, `seekToStart` and `seekToEnd` all write through one `seekPatch`, which owns the current track's bound and the `seekTo` mailbox. The fraction is clamped in the store, so the bar sends the pointer's fraction against its own box and no longer multiplies by the duration; Home and End name `seekToStart` and `seekToEnd`. `PlayerAudio` asks `shouldApplySeek` (the store's 0.5 second tolerance) before writing `currentTime`, and the Media Session handlers call `seekByPage` at press time, so their effect binds once rather than on every position update.

The resume target stays the audio element's: it is applied on `loadedmetadata`, not on a seek request, and moving it into the seek mailbox would make a user seek wait for metadata too.

Verification: `pnpm --filter @playliberty/web test` is 504 passed (50 files); `pnpm run build` and `pnpm run lint` pass; `pnpm test:e2e` is 35 passed.

## Objective

The player store exposes named seek commands, and the bar, the audio element, the media session and the keyboard name intent without owning a step, a bound or the geometry.

## Context

The store already owns the bound and the apply-once mailbox, but the callers still own three step sizes (keyboard 5 seconds, media session 10 seconds, epsilon 0.5 seconds), the pointer-to-seconds geometry, Home and End, and the resume target. The media session handlers close over the position, so they are rebound on every position update.

Architecture review 2026-10-19, candidate 6.

## Scope

- The store exposes commands such as `seekBy`, `seekByPage`, `seekToFraction`, `seekToStart` and `seekToEnd`.
- Step sizes, the epsilon, the bound and the fraction clamp live in the store or its module.
- The bar passes a pointer fraction, not seconds. The media session and the keyboard pass an intent. The audio element applies the pending target.
- The media session handlers no longer depend on the current position.
- Position, seek and resume behavior are unchanged at both ends of a track.

## Out of scope

Playback state, queue, shuffle, volume and the Media Session metadata.

## Blocking edges

None. Can start immediately.

## Verification

- No caller outside the player store defines a seek step or a seek epsilon.
- A seek below zero and above the duration clamps once.
- A media session seek and a keyboard seek use the same command path.
- `pnpm run build`, `pnpm run lint`, the web suite and `pnpm test:e2e` pass.
