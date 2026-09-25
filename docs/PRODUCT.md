# Product

PlayLiberty is an audio player for web and mobile that syncs YouTube playlists and keeps the tracks saved, so a video deleted from YouTube does not remove it from the user's library.

## Platform

The intended surfaces are a web client and a mobile client, backed by a self-hosted Node/TypeScript service that owns sync and storage. No client or service exists yet: the repository currently holds a workspace scaffold and shared utilities. Production runs on the owner's infrastructure behind the Pangolin authenticating edge.

## Users

The owner: one person, at most a small household, who listens to music through YouTube playlists and wants that listening to survive video removals. They reach the service from a phone and a desktop browser after authenticating at the Pangolin edge.

## Product Purpose

Keep a playable, personal copy of the music the user already chose, and keep it in sync with the source playlists. Done, from the user's side, means: point PlayLiberty at a playlist, and later still be able to play every track that was there, even after YouTube removes some of the videos. The user never has to notice a removal.

## Positioning

Against using YouTube directly: videos disappear and playlists silently lose tracks. Against manual downloading: a download does not stay in sync and does not know the playlist. PlayLiberty keeps a durable library and reconciles it with the source playlists over time.

## Operating Context

On demand and self-hosted. The owner triggers or schedules a sync, then plays from the retained library on their own devices. One user at a time; nothing is shared or published.

## Capabilities and Constraints

Capabilities, intended:

- Point PlayLiberty at one or more YouTube playlists.
- Sync each playlist into a library: detect new videos, retain previously synced tracks.
- Play the retained library from the web and mobile clients.
- Survive the removal of a source video.

Hard constraints:

- Personal, single-user use. Do not build sharing, publishing, or redistribution features. The library is for the owner's own listening.
- The library, not YouTube, is the source of truth for playback.
- A sync must never delete a track the user already has because the source video disappeared.
- Sync depends on YouTube being reachable. Losing that access must not damage the existing library.

## Brand Commitments

Calm, content-first, and quiet. The interface is a music library, not a video feed. It should feel like a dependable personal shelf, and must not nag or gamify.

## Evidence on Hand

None yet. This repository is pre-implementation: the only shipped code is the workspace scaffold and `packages/utils`. Product decisions so far rest on the owner's stated intent, recorded here.

## Product Principles

1. A removed source video must never remove an already-synced track.
2. The retained library is authoritative for playback; YouTube is an input, not a dependency at play time.
3. Sync is incremental and repeatable; running it twice changes nothing the second time.
4. Keep the personal, single-user boundary; refuse features that imply redistribution.

## Accessibility & Inclusion

Target the usual bar: keyboard reach and visible focus on the web client, sufficient contrast in light and dark, and respect for reduced-motion preferences. No UI exists yet, so nothing is enforced; enforcement starts with the first client and is recorded in `docs/DESIGN.md`.
