# Define the mobile client stack

Status: open
Labels: `enhancement`, `ready-for-human`

## Objective

Choose and record the stack for `apps/mobile` through a grilling session. Scaffold only what the decision requires. Streaming only in v1; offline is out of scope.

## Context

Read `docs/PRODUCT.md`, `docs/GLOSSARY.md`, and `docs/ARCHITECTURE.md` first.

## Decisions to settle

- Framework, for example React Native with Expo or Flutter, and why, weighing type sharing with `packages/contracts`.
- Audio playback: how the client streams (`Range`) and manages the per-client queue and position.
- How a native client authenticates through the Pangolin edge. Forwarded headers only reach the origin, so the client must satisfy Pangolin itself, for example with a resource access token, a shareable link, or an OIDC flow. This is the key open question.
- Navigation and styling, and how it realizes `docs/DESIGN.md`.
- Build and distribution: local development builds, and how a release reaches the user's device.
- Accessibility where the platform exposes it, including reduced motion.

## Out of scope

Offline playback, the server and web stacks, and any product behavior change.

## Blocking edges

None for the stack choice. The authentication decision is shared with task 01 and should be settled consistently.

## Verification

- An ADR in `docs/adr/` records the chosen stack, the authentication approach, and the alternatives rejected.
- `pnpm run build` and `pnpm run lint` pass with the scaffolded client.
- `npx depcruise .` and `npx syncpack lint` pass.
