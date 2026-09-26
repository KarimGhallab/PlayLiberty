# Scaffold the mobile client skeleton

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Create the minimal compiling skeleton for `apps/mobile` as decided in `docs/adr/0007-mobile-stack.md`. The goal is an app that builds, lints, tests, and installs on Android, not the product features. The provisioning flow is task `07`.

## Context

Read `docs/adr/0007-mobile-stack.md`, `docs/adr/0008-mobile-provisioning.md`, `docs/adr/0009-design-system-token-layer.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/GLOSSARY.md`, and `docs/DESIGN.md` first.

## Scope

- Expo SDK 57 app: React Native 0.86.3, React 19.2, New Architecture, TypeScript.
- Expo Router with placeholder screens for the playlists list, the playlist detail, the account, and a settings or auth screen.
- TanStack Query provider, a Zustand player store, and `expo-audio` with the background config plugin: one player, the queue via `useAudioPlaylist`, lock-screen controls, and background playback mode.
- React Native `StyleSheet` over the values in `@playliberty/tokens`, the same values the web app consumes, with `StyleSheet` helpers built once over them rather than per screen.
- `expo-secure-store` plumbing, and an API client that consumes `packages/contracts`, attaches the `P-Access-Token-Id` and `P-Access-Token` headers, sends `X-PlayLiberty-Client` on mutations, and treats a `401` as "needs provisioning".
- Accessibility from the start: labels and roles on touchables, `AccessibilityInfo.isReduceMotionEnabled`, Dynamic Type respected with capped multipliers only where layout breaks, and 44x44 point targets.
- Jest with `jest-expo`, React Native Testing Library 14, and MSW (`msw/native`), with a couple of sample tests.
- App config: the `dev.playliberty.app` scheme, and placeholder App Links and Universal Links entries.
- Repo wiring: pnpm `overrides` pinning one React and one React Native version, `nodeLinker: isolated`, the `tsconfig.depcruise.json` path, root scripts, and the Jest pnpm `transformIgnorePatterns`.

## Out of scope

The provisioning flow (task `07`), real feature behavior, iOS build and verification, and offline playback.

## Blocking edges

Blocked by `10-build-design-foundation`, which produces the token values and the shared UI decisions this app renders with. It also consumes `packages/contracts` from task 01.

## Verification

- `pnpm run lint`, `pnpm run format`, `tsc --noEmit`, and `pnpm run test` pass.
- `npx depcruise .`, `npx syncpack lint`, and `node ./scripts/validate-tsconfig-paths.cjs` pass.
- A development build installs on an Android device and starts.
