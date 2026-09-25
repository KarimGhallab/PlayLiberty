# Define the web client stack

Status: open
Labels: `enhancement`, `ready-for-human`

## Objective

Choose and record the stack for `apps/web` through a grilling session. Scaffold only what the decision requires.

## Context

Read `docs/PRODUCT.md`, `docs/GLOSSARY.md`, and `docs/ARCHITECTURE.md` first. The product behavior is settled.

## Decisions to settle

- Framework and build tool, for example React with Vite or Next.js, and why.
- Routing and data fetching, and how the client consumes `packages/contracts`.
- Audio playback: how the client streams (`Range`) and manages the per-client queue and position.
- Styling approach and how it realizes `docs/DESIGN.md`.
- State management for playlists, shares, sync status, and track states.
- How the client is served behind Pangolin and whether it needs anything beyond the edge's authentication.
- Accessibility: keyboard reach, visible focus, and reduced motion.

## Out of scope

The server and mobile stacks, and any product behavior change.

## Blocking edges

None. It consumes the API contract from task 01, so read those contract decisions before finalizing.

## Verification

- An ADR in `docs/adr/` records the chosen stack and the alternatives rejected.
- `pnpm run build` and `pnpm run lint` pass with the scaffolded client.
- `npx depcruise .` and `npx syncpack lint` pass.
