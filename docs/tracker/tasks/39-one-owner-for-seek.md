# One owner for seek

Status: open
Labels: `enhancement`, `ready-for-agent`

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
