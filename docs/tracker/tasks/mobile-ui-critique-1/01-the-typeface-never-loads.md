# 01: The typeface never loads

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. The font file and `expo-font` are in place.

## Observed

`packages/tokens/src/values.ts` names the family `IBM Plex Sans`, `apps/mobile/src/shared/styles/tokens.ts` passes it
into every `Text` style, and the app has no font asset, no `expo-font` dependency, no config plugin and no loader. On
Android an unresolved family falls back to the platform face, so every screen renders in Roboto. The type scale, the
three weights and the two layouts capped at 1.3 were all measured against Plex metrics.

## Expected

The mobile client draws in IBM Plex Sans, as the web client does: one variable file covering the three shipped
weights, self-hosted, loaded before the first frame so no screen flashes the fallback.

## Evidence

- `packages/tokens/src/values.ts`: `'font-ui': 'IBM Plex Sans'`.
- `apps/mobile/src/shared/styles/tokens.ts`: `fontFamily = families['font-ui'].value`.
- `apps/mobile/package.json`: no `expo-font`.
- `apps/mobile/assets/`: `shelf/` and `splash-icon.png` only, plus the generated splash set.
- `apps/mobile/app/_layout.tsx`: no font load.
- Every screenshot of the 2026-11-03 critique run shows the platform face.

## Acceptance criteria

- [x] The family resolves on device: a rendered title shows Plex's tailed `l` and its angled terminals.
- [x] The weights the design uses resolve from one variable file, not one file per weight.
- [x] The first frame is gated on the load, or the splash is held, so a cold start never shows the fallback.
- [x] `families['font-ui']` stays the only owner of the name.
- [x] No screen overflows or reflows at the two capped surfaces (the card and the identity header) once the real
      metrics land.
- [x] `pnpm --filter @playliberty/mobile run test` and the app's screenshots pass.

## Outcome

`apps/mobile/app/_layout.tsx` loads the roman variable file with `useFonts` under the family name the tokens already
carry, `'IBM Plex Sans'`. `SplashScreen.preventAutoHideAsync()` runs at module scope and the splash is released when the
font resolves, so the first painted frame is Plex; `families['font-ui']` remains the only owner of the name. A font that
fails to load releases the splash and lets the platform face stand in, rather than holding the app on the splash.

The gate sits after every hook: returning early above the layout's two `useCallback`s changes the hook order and React
refuses the second render, which is exactly what the first attempt did.

Verified on the emulator at 1080x2400 against the previous build's screenshots: the wordmark's lowercase `l` carries
Plex's tail and its terminals are cut at an angle, which Roboto's do not. At the same 12sp the state word (semibold)
is visibly heavier than the time beside it (regular), so the variable axis reaches the shipped weights. The library
card and the compact detail header hold their layouts at 1.0, including the card's French not-stored sentence.

The italic file (`IBMPlexSans-Italic-VariableFont_wdth,wght.ttf`) is not loaded and not needed: the app sets no italic
anywhere.

`package.json` asks for `expo-font@^58.0.11` while Expo SDK 57 pins `~57.0.4`. It loads today, but the direct
dependency is ahead of the SDK and a dev-client rebuild can diverge; `npx expo install expo-font` in `apps/mobile`
would align it.
