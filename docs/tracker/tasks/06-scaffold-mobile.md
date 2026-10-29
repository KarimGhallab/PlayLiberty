# Scaffold the mobile client skeleton

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`apps/mobile` exists and runs on an Android emulator: the Expo SDK 57 app of
[`19-the-mobile-shell`](../specs/19-the-mobile-shell.md), with React Native 0.86.3, React 19.3.1 and the New
Architecture.

- **Routes.** The library at the root, the playlist detail pushed, a bare track, the egress console, and a
  not-found body. The signed-out state replaces the library's content and issues no read. The account sheet is a
  modal owned by the shell, holding the language control and Sign out, and the egress door is the spec `31`
  mount point.
- **State.** TanStack Query owns server state, the Zustand player store holds the queue as track ids, and
  `expo-audio` is wired through `useAudioPlaylist` with the background audio mode. The queue has no surface yet;
  spec `23` builds it.
- **Access.** `expo-secure-store` holds the token pair and the language choice. The API client sends
  `P-Access-Token-Id` and `P-Access-Token` on every request, `X-PlayLiberty-Client` on mutations only, and maps
  `401` to provisioning. A read without a token is refused before it leaves the app.
- **Presentation.** `StyleSheet` over the shared token module through one helper layer, dark only, one column at
  every width. `Screen` is the frame; every touch target meets 44 points; reduced motion is read from the system
  and applied to the account sheet.
- **Shared package.** `packages/i18n` gained the `LanguageStore` port and the `applyLanguage` seam, and the
  mobile copy keys. The web's suites and journeys pass against it.
- **Development build.** `expo-dev-client` is installed, so the app opens on the launcher and
  `expo start --dev-client` does what the script says. The `start` script is gone: plain `expo start` targets
  Expo Go, which cannot run this app.

## Verification

- `pnpm --filter @playliberty/mobile run typecheck` passes; Jest is 14 passed across 4 suites.
- `pnpm run build`, `pnpm run lint:check`, `npx depcruise .`, `npx syncpack lint` and
  `node ./scripts/validate-tsconfig-paths.cjs` pass.
- The unit suites pass serially: web 647, server 438, i18n 37, youtube 61, ui-foundation 5, tokens 2, mobile 14.
  `pnpm run test:e2e` is 47 passed. The parallel `test:unit` run trips a shared vitest cache race, not this work.
- Gradle `assembleDebug` succeeds, the APK installs on `emulator-5554`, the launcher opens, and the bundle renders
  the signed-out state.

## Notes

- React is pinned to the web's `19.3.1` through the workspace override rather than Expo's bundled `19.2.3`;
  React Native's peer range accepts it and one React is kept across the workspace.
- The API client's test stubs `fetch`. MSW 3 dropped `msw/native`, and the test runtime's fetch is an XHR
  polyfill the node interceptor cannot patch, so `msw` is not a dependency.
- Lock-screen metadata is spec `24`'s: `setActiveForLockScreen` lives on `AudioPlayer`, not on the
  `AudioPlaylist` the queue uses. The scaffold sets the audio mode that makes it possible.
- `expo-splash-screen` writes a style that references `splashscreen_logo` even with no image configured. A
  transparent `assets/splash-icon.png` is the placeholder that keeps the resource link valid.
- The emulator needs the mise-managed SDK (`android-sdk` via `vfox`), Java 21 from `mise.toml`, and a system
  image. `apps/mobile/.env.local` carries `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5173` so the app reaches the
  Vite proxy, which injects the edge headers the server requires.

See [the mobile shell spec](../specs/19-the-mobile-shell.md). The next ticket is
[`07`](07-provision-mobile-access.md).
