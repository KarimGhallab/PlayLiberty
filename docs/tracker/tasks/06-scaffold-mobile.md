# Scaffold the mobile client skeleton

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Create the minimal compiling skeleton for `apps/mobile` as decided in [`The mobile stack`](../../ARCHITECTURE.md#the-mobile-stack). The goal is an app that builds, lints, tests, and installs on Android, not the product features. The provisioning flow is task `07`.

## Context

Read `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, and `docs/GLOSSARY.md` first, then
[`19-the-mobile-shell`](../specs/19-the-mobile-shell.md), which is this ticket's decision record.

## Scope

- Expo SDK 57 app: React Native 0.86.3, React 19.2, New Architecture, TypeScript.
- Expo Router with the four placeholder routes of
  [`19-the-mobile-shell`](../specs/19-the-mobile-shell.md): the library at the root, the playlist detail
  pushed over it, a bare track and the egress console, plus the account sheet's mount point. Sign-in is a
  full-screen state of the library route rather than a route, because a route only reachable from a state
  of another route is a route that exists to be a state; signed out, no other resource in the app is
  reachable, so the prompt replaces the content area rather than sitting over it. There is no bottom tab bar
  and no drawer: the library is the root, the detail is pushed, and the platform gesture is the way back.
  The two-route inventory this line used to name was revised by the shell spec, which added the track and
  egress routes and the account sheet.
- TanStack Query provider, a Zustand player store, and `expo-audio` with the background config plugin: one player, the queue via `useAudioPlaylist`, lock-screen controls, and background playback mode. The queue is client state that never reaches the database, the order the user sets is re-applied over every refetch, and it has no surface yet: the queue is a sheet above the bar specified in the player bar record, so this ticket builds the state without implying a view.
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
