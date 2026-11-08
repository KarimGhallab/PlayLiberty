# 01: The typeface never loads

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

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
