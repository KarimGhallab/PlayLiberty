# 16: The brand name translates

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Needs a brand decision.

## Observed

The interface calls the product "PlayLiberty" in English and "PlayLiberté" in French. The word is the one the
household reads and says; it changes spelling with a setting.

## Expected

One spelling in every language, or a recorded decision that the localised spelling is deliberate and where it applies.
A proper noun is not translated.

## Evidence

- `packages/i18n/src/fr.ts`: the brand name carries an accent.
- `packages/i18n/src/en.ts`: it does not.
- The 2026-11-03 screenshots: the library header in both languages, "PlayLiberté" and "PlayLiberty".

## Acceptance criteria

- [x] Either one spelling ships in both catalogs, or the decision is recorded in `docs/PRODUCT.md` or the glossary.
- [x] The app's display name, the manifest and the sign-in door agree with the interface.
- [x] A test pins the name so a translator pass cannot re-accent it.

## Outcome

The brand is `PlayLiberté` everywhere it is read. `packages/i18n/src/en.ts` now spells the name with the accent, so both
catalogs agree. The mobile app's `app.json` display name, the web page title and its `apple-mobile-web-app-title`, and
the web manifest's `name` and `short_name` all carry the same spelling. The sign-in door and the library header already
render `app.name`, so they follow the catalog without a second copy.

The header, the wordmark and the browser tab now read `PlayLiberté` in either language, and the launcher label follows
the Expo display name on a fresh native build.

`packages/i18n/src/catalogs.test.ts` pins `app.name` to `PlayLiberté` in both catalogs, so a translator pass that
re-accented or de-accented either one fails.

Checks: `pnpm --filter @playliberty/i18n test` 43 passed, mobile 601 passed, web 625 passed, `pnpm run build` clean,
`pnpm run lint:check` clean.
