# Build the mobile client with Expo and React Native

`apps/mobile` is an Expo SDK 57 React Native app (React Native 0.86.3, React 19.2, New Architecture) written in TypeScript, consuming `packages/contracts` directly. Navigation is Expo Router. Server state is TanStack Query; the player and queue use Zustand plus `expo-audio` for background playback, lock-screen controls, and the queue. Styling is React Native `StyleSheet` over a typed token module mirroring `docs/design-system/`, dark only. The access token lives in `expo-secure-store`. Tests are Jest with `jest-expo`, React Native Testing Library 14, and MSW. Distribution in v1 is a development build and a sideloaded Android APK; the code stays cross-platform but iOS is not built or tested.

The contract is Zod, TypeScript only, so React Native consumes it with no codegen; Flutter would require generated or duplicated Dart models, which defeats the single-source contract this project is built on. Expo has first-class pnpm monorepo support, so no manual Metro configuration is needed. `expo-audio` covers the queue, lock screen, background playback, Range streaming, and per-source auth headers under MIT, which is everything the player needs, and a development build is required for its background config plugin. Jest is the React Native standard, so the workspace carries Vitest for the server, web, and pure packages and Jest for the app. React is pinned to 19.2 across the workspace to match Expo SDK 57's pin, which moves the web app from 19.3 to 19.2 (ADR 0005 amended); the web app needs nothing that 19.3 added.

Alternatives rejected:

- Flutter: it cannot consume Zod, so it needs Zod-to-Dart codegen or duplicated models and a second language in the workspace.
- Native Swift and Kotlin: two codebases for one small app.
- `expo-av`: deprecated and removed from Expo Go in SDK 55.
- `@rntp/player` v5 as the primary audio library: capability is comparable, but it is commercially licensed and a larger native dependency. Kept as a documented escape hatch if `expo-audio`'s playlist and lock-screen behavior proves insufficient.
- React Navigation standalone: Expo Router gives typed routes and deep links, which the provisioning flow needs.
- NativeWind and other styling systems: Metro and Babel configuration surface for little gain in a small dark-only app.
- Vitest for the app: no React Native support.
- Manual Metro monorepo configuration: unnecessary since SDK 52 and now counterproductive.
- iOS distribution in v1: only Android hardware is available, so iOS is kept compiling but not verified.

Amendment, from `0010-tabler-icons.md`: the app takes `@tabler/icons-react-native` for its glyphs, pinned to the same exact version the web app pins `@tabler/icons-react` to, so both clients draw the artwork from one pinned `@tabler/icons` release rather than from two hand-maintained sets of geometry. The package renders through `react-native-svg`, which the app adds as a dependency at the version `expo install` resolves for SDK 57, and it is the app's only native dependency beyond the Expo modules this record already names. Icons are imported one at a time rather than from the barrel, because the set ships 6,220 icons and Metro does not tree-shake by default. Nothing in the styling decision changes: a glyph is a `react-native-svg` element that takes `color` and a size from a token, so it sits inside the `StyleSheet` rules above rather than beside them.
