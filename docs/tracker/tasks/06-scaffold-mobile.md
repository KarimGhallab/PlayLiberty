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
  mount point. - **State.** TanStack Query owns server state, the Zustand player store holds the queue as track ids, and
  `expo-audio` is wired through `useAudioPlaylist` with the background audio mode. The queue has no surface yet;
  spec `23` builds it. - **Access.** `expo-secure-store` holds the token pair and the language choice. The API client sends
  `P-Access-Token-Id` and `P-Access-Token` on every request, `X-PlayLiberty-Client` on mutations only, and maps
  `401` to provisioning. A read without a token is refused before it leaves the app. - **Presentation.** `StyleSheet` over the shared token module through one helper layer, dark only, one column at
  every width. `Screen` is the frame; every touch target meets 44 points; reduced motion is read from the system
  and applied to the account sheet. - **Shared package.** `packages/i18n` gained the `LanguageStore` port and the `applyLanguage` seam, and the
  mobile copy keys. - **Development build.** `expo-dev-client` is installed, so the app opens on the launcher and
  `expo start --dev-client` does what the script says. The `start` script is gone: plain `expo start` targets
  Expo Go, which cannot run this app.

**Constraints:** React is pinned to the web's `19.3.1` through the workspace override. `msw` is not a dependency: its native interceptor cannot patch the test runtime's XHR polyfill. A transparent `assets/splash-icon.png` keeps `expo-splash-screen`'s `splashscreen_logo` reference valid. The emulator needs the mise-managed SDK (`android-sdk` via `vfox`), Java 21 from `mise.toml`, and a system image. `apps/mobile/.env.local` carries `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5173` so the app reaches the Vite proxy, which injects the edge headers the server requires. Lock-screen metadata is spec `24`'s.

See [the mobile shell spec](../specs/19-the-mobile-shell.md). The next ticket is
[`07`](07-provision-mobile-access.md).
