# 01: The package, the provider and the language switch

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Done. The tracer bullet lands the package, the provider and the first surface.

- `@playliberty/i18n` is a new workspace package. `en` defines the `Messages` shape and `fr` is typed as it, so a
  missing French key fails the build. `createTranslator` is the hand-rolled runtime: `{name}` interpolation,
  one/other plurals chosen by a per-language category function, and a function entry as the escape hatch.
  `resolveLanguage` resolves once per browser: an explicit choice wins, a browser preference matches by prefix
  (`fr-CA` to `fr`), otherwise English. `languageStorage` remembers the choice under `playliberty.language`.
- `I18nProvider` binds `t` to the active catalog, remembers a choice and writes the page's `lang`. It wraps the
  router in `main.tsx` and the render helpers of the tests it reaches.
- The library header gains `LanguageMenu`: a globe opening a two-row menu, the active row checked and the
  trigger named by `language.label`. The library page, its skeleton and the empty gallery render through `t`.
- The throwaway `src/prototype/` tree is deleted and the router is back to its two routes.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (i18n 16, server 275, web 365). The
package's tests cover resolution, interpolation and plural selection; the switch, its persistence and the
document `lang` are tested in `LanguageMenu.test.tsx` and `LibraryPage.test.tsx`. Not committed.
