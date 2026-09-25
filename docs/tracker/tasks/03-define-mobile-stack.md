# Define the mobile client stack

Status: resolved
Labels: `enhancement`

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

## Outcome

Resolved by a grilling session. The stack is recorded in `docs/adr/0007-mobile-stack.md`: Expo SDK 57 with React Native and React 19.2, Expo Router, TanStack Query, Zustand, `expo-audio`, React Native `StyleSheet` over a typed token module, and Jest with React Native Testing Library and MSW. React is pinned to 19.2 across the workspace, amending `docs/adr/0005-web-stack.md`. The authentication approach is `docs/adr/0008-mobile-provisioning.md`: a self-service browser SSO flow that returns a one-time PKCE-bound code, exchanged for a 180-day per-user Pangolin access token, so the origin still trusts only `Remote-*`.

The build, lint, test, depcruise, and Android install checks are carried out by `06-scaffold-mobile`, and the provisioning flow by `07-provision-mobile-access`. This task resolves on the decision.
