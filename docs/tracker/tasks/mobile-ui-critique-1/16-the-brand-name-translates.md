# 16: The brand name translates

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The brand is `PlayLiberté` everywhere it is read. `packages/i18n/src/en.ts` now spells the name with the accent, so both
catalogs agree. The mobile app's `app.json` display name, the web page title and its `apple-mobile-web-app-title`, and
the web manifest's `name` and `short_name` all carry the same spelling. The sign-in door and the library header already
render `app.name`, so they follow the catalog without a second copy.

The header, the wordmark and the browser tab now read `PlayLiberté` in either language, and the launcher label follows
the Expo display name on a fresh native build.
