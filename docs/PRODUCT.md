# Product

PlayLiberty is a self-hosted, multi-user audio player for web and mobile that mirrors YouTube playlists into a server-owned media store and keeps the audio, so a video removed from YouTube does not remove it from the user's playlists.

## Platform

Three surfaces: a server that owns accounts, playlists, the media store, sync, and streaming; a web client; and a mobile client. All run on the owner's infrastructure, behind the Pangolin authenticating edge. The server is Node 26 with Fastify 5 and a local SQLite database, in this pnpm monorepo (see [the server stack](ARCHITECTURE.md#the-server-stack)). The web client is a React 19.3 and Vite SPA served by nginx as the single public origin (see [the web stack](ARCHITECTURE.md#the-web-stack)); playback is one browser audio element with the Media Session API. The mobile client is an Expo React Native app whose v1 runtime is Android, streaming through the same origin with background playback, lock-screen and notification controls, and its own queue (see [the mobile stack](ARCHITECTURE.md#the-mobile-stack)). It carries a per-user Pangolin access token obtained through a self-service browser flow instead of a browser session (see [mobile provisioning](ARCHITECTURE.md#mobile-provisioning)).

The server, both clients and every shared package exist: `apps/server`, `apps/web`, `apps/mobile`, `packages/contracts`, `packages/api-client`, `packages/library`, `packages/player`, `packages/tokens`, `packages/ui-foundation`, `packages/i18n`, `packages/query`, `packages/youtube`. The mobile client runs as a development build; its signed, sideloaded Android APK is the release step that remains. iOS stays in the shared code and is not built or tested in v1.

## Users

A small group of accounts on one private instance, normally a household. Each account curates its own playlists and can share a playlist with other accounts on the same instance. Accounts are provisioned from Pangolin identity; neither client stores a password, and the phone holds only a per-user access token it can revoke by signing out.

## Product Purpose

Keep a playable, personal copy of the music each user already chose, and keep it in sync with the source playlists. Done, from the user's side, means: paste a playlist, and later still play every track that was there, even after YouTube removes videos. The user never has to notice a removal.

## Positioning

Against using YouTube directly: videos disappear and playlists silently lose tracks. Against manual downloading: a download does not stay in sync and does not know the playlist. PlayLiberty keeps a durable, deduplicated media store and reconciles it with the sources over time.

## Operating Context

On demand and self-hosted. A user pastes a playlist URL or a single video URL and triggers a sync from either client; the server downloads the audio; users then play from the web and mobile clients, which carry the same verbs: sync, curate, share, pin, sort, filter, and set a cover. Streaming only in v1, so no client keeps a local copy, and the queue and the position are per client. On the phone, playback continues with the screen off and is controlled from the lock screen and the notification shade rather than from a page that must stay open.

## Capabilities and Constraints

Capabilities in v1:

- Ingest a YouTube playlist URL or a single video URL.
- Sync a playlist into the media store: add new videos, retain tracks whose source video is gone.
- Stream stored tracks to the web and mobile clients; the mobile player keeps playing with the screen off and exposes lock-screen and notification controls.
- Provision a phone by signing in once in the browser, so the app holds a token and never a password.
- Multiple accounts, each with its own playlists; a playlist owner can share read-only or read-write with specific accounts.
- Add one pasted video to several write-accessible playlists at once.
- Pin playlists to the top of the account's own gallery.
- Set, crop or remove a custom cover for a playlist, shared with everyone who can read it. See the
  [playlist cover](GLOSSARY.md#content) for the fallback chain.
- Manual sync, retention, and weekly orphan pruning.
- An admin can check or switch the YouTube egress exits from the library header on either client.

Hard constraints:

- Audio only. No video storage or playback.
- No audio transcoding, ever. The stored audio format must play natively everywhere, which fixes it to AAC/M4A. See [audio is stored as-is, never transcoded](ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded).
- The stored media, not YouTube, is the source of truth for playback.
- A sync must never delete a track because a source video disappeared.
- No global library view: playlists are the only entry point to content.
- The instance is private; authentication is Pangolin's, not the app's. See [identity comes from Pangolin's forwarded headers](ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers).

## Non-Goals

Permanent: sharing outside the instance, public or unauthenticated access, casting, social features, scrobbling, audio transcoding, video, file export or download endpoints, ratings, play counts, and search.

## Brand Commitments

Calm, content-first, and quiet. The interface is a playlist library, not a video feed. It should feel like a dependable personal gallery, and must not nag or gamify.

## Product Principles

1. A removed source video must never remove an already-stored track.
2. The stored media is authoritative for playback; YouTube is an input, not a dependency at play time.
3. Sync is incremental and repeatable; running it twice changes nothing the second time.
4. Keep the private-instance boundary; refuse features that imply redistribution.
5. One video id, one stored file, shared by every playlist that references it.

## Accessibility & Inclusion

Target the usual bar: keyboard reach and visible focus on the web client, sufficient contrast in the dark theme the clients ship, and respect for reduced-motion preferences. On the mobile client every control is a 48dp target with a name and a role, Dynamic Type is honoured with a capped multiplier only where a fixed layout would break, and reduced motion is read from the system. The design decisions, and the rules that hold them, are in [DESIGN.md](DESIGN.md).
