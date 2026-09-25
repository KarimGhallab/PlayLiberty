# Product

PlayLiberty is a self-hosted, multi-user audio player for web and mobile that mirrors YouTube playlists into a server-owned media store and keeps the audio, so a video removed from YouTube does not remove it from the user's playlists.

## Platform

Three surfaces: a server that owns accounts, playlists, the media store, sync, and streaming; a web client; and a mobile client. All run on the owner's infrastructure, behind the Pangolin authenticating edge. The server is Node 26 with Fastify 5 and a local SQLite database, in this pnpm monorepo (see `docs/adr/0004-server-stack.md`). The web client is a React 19.2 and Vite SPA served by nginx as the single public origin (see `docs/adr/0005-web-stack.md`). The mobile client is an Expo React Native app carrying a per-user Pangolin access token obtained through a self-service browser flow (see `docs/adr/0007-mobile-stack.md` and `docs/adr/0008-mobile-provisioning.md`). No server or client code exists yet: the repository currently holds a workspace scaffold and shared utilities.

## Users

A small group of accounts on one private instance, normally a household. Each account curates its own playlists and can share a playlist with other accounts on the same instance. Accounts are provisioned from Pangolin identity; the app holds no passwords.

## Product Purpose

Keep a playable, personal copy of the music each user already chose, and keep it in sync with the source playlists. Done, from the user's side, means: paste a playlist, and later still play every track that was there, even after YouTube removes videos. The user never has to notice a removal.

## Positioning

Against using YouTube directly: videos disappear and playlists silently lose tracks. Against manual downloading: a download does not stay in sync and does not know the playlist. PlayLiberty keeps a durable, deduplicated media store and reconciles it with the sources over time.

## Operating Context

On demand and self-hosted. A user pastes a playlist URL or a single video URL and triggers a sync; the server downloads the audio; users then play from the web and mobile clients. Streaming only in v1, and playback state is per client.

## Capabilities and Constraints

Capabilities in v1:

- Ingest a YouTube playlist URL or a single video URL.
- Sync a playlist into the media store: add new videos, retain tracks whose source video is gone.
- Stream stored tracks to the web and mobile clients.
- Multiple accounts, each with its own playlists; a playlist owner can share read-only or read-write with specific accounts.
- Add one pasted video to several write-accessible playlists at once.
- Manual refresh, retention, and weekly orphan pruning.

Hard constraints:

- Audio only. No video storage or playback.
- No transcoding, ever. The stored format must play natively everywhere, which fixes it to AAC/M4A. See `docs/adr/0002-no-transcoding-store-aac-m4a.md`.
- The stored media, not YouTube, is the source of truth for playback.
- A sync must never delete a track because a source video disappeared.
- No global library view: playlists are the only entry point to content.
- The instance is private; authentication is Pangolin's, not the app's. See `docs/adr/0003-identity-via-pangolin-forwarded-headers.md`.

## Non-Goals

Permanent: sharing outside the instance, public or unauthenticated access, casting, social features, scrobbling, transcoding, video, file export or download endpoints, favorites, ratings, play counts, and search.

## Brand Commitments

Calm, content-first, and quiet. The interface is a playlist library, not a video feed. It should feel like a dependable personal shelf, and must not nag or gamify.

## Evidence on Hand

The product definition and the server, web, and mobile stacks all came out of structured grilling sessions. The decisions are recorded in `docs/GLOSSARY.md`, `docs/ARCHITECTURE.md`, and `docs/adr/`, with `docs/adr/0004-server-stack.md`, `docs/adr/0005-web-stack.md`, and `docs/adr/0007-mobile-stack.md` covering the stacks and `docs/adr/0008-mobile-provisioning.md` the mobile access model. There is no code besides the workspace scaffold and `packages/utils`, no tests, and no dataset.

## Product Principles

1. A removed source video must never remove an already-stored track.
2. The stored media is authoritative for playback; YouTube is an input, not a dependency at play time.
3. Sync is incremental and repeatable; running it twice changes nothing the second time.
4. Keep the private-instance boundary; refuse features that imply redistribution.
5. One video id, one stored file, shared by every playlist that references it.

## Accessibility & Inclusion

Target the usual bar: keyboard reach and visible focus on the web client, sufficient contrast in light and dark, and respect for reduced-motion preferences. No UI exists yet, so nothing is enforced; enforcement starts with the first client and is recorded in `docs/DESIGN.md`.
