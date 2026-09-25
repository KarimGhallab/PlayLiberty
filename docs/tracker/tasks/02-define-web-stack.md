# Define the web client stack

Status: resolved
Labels: `enhancement`

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

## Outcome

Resolved by a grilling session. The stack is recorded in `docs/adr/0005-web-stack.md`: React 19.3 with the React Compiler, Vite 8, TypeScript 6, TanStack Router, TanStack Query v5, Zustand 5, SCSS with CSS Modules over dark-only tokens, a single global audio element with the Media Session API, `localStorage` persistence, and Vitest with RTL, jsdom, and MSW. The client is served by a dedicated nginx container as the single public origin, proxying `/api` to the server; the CSRF defense is recorded in `docs/adr/0006-csrf-defense.md`.

The build, lint, test, depcruise, and container checks are carried out by `05-scaffold-web`, which creates the skeleton. This task resolves on the decision.
