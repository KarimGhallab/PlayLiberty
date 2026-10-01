# Scaffold the web client skeleton

Status: resolved
Labels: `enhancement`

## Outcome

`apps/web` exists and builds, lints, tests, serves and runs in an nginx container. It realizes ADR 0005's shape and writes no feature behavior: TanStack Router at `/` and `/playlists/$playlistId`, a placeholder `GET /api/v1/playlists` read through TanStack Query, the same-origin API client with the client header on mutations and the re-auth navigation on `401`, the Zustand player store with an order-preserving `replaceQueue` and localStorage persistence, one global audio element with feature-detected Media Session, SCSS modules over `@playliberty/tokens/tokens.css`, and Vitest/RTL/MSW tests. See [`0005-web-stack`](../../adr/0005-web-stack.md) and [`0006-csrf-defense`](../../adr/0006-csrf-defense.md).

## Verification

Build, lint, format, test, depcruise, syncpack and the tsconfig path check pass; `apps/web` builds to `dist/`, the dev server serves it, and the production nginx container publishes no host port.
