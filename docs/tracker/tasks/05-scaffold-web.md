# Scaffold the web client skeleton

**Status:** resolved
**Labels:** `enhancement`

## Outcome

`apps/web` exists and builds, lints, tests, serves and runs in an nginx container. It realizes [`The web stack`](../../ARCHITECTURE.md#the-web-stack)'s shape and writes no feature behavior: TanStack Router at `/` and `/playlists/$playlistId`, a placeholder `GET /api/v1/playlists` read through TanStack Query, the same-origin API client with the client header on mutations and the re-auth navigation on `401`, the Zustand player store with an order-preserving `replaceQueue` and sessionStorage persistence, one global audio element with feature-detected Media Session, SCSS modules over `@playliberty/tokens/tokens.css`, and Vitest/RTL/MSW tests. See [`The web stack`](../../ARCHITECTURE.md#the-web-stack) and [`Mutating requests carry a client header and pass origin checks`](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks).
