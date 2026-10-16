# 01: The package, the provider and the language switch

**Status:** resolved

## Outcome

`@playliberty/i18n` is a new workspace package: `en` defines the `Messages` shape and `fr` is typed as it, so a missing French key fails the build. `createTranslator` is the hand-rolled runtime with `{name}` interpolation, one/other plurals chosen by a per-language category function, and a function entry as the escape hatch; `resolveLanguage` resolves once per browser, with an explicit choice winning, a browser preference matching by prefix (`fr-CA` to `fr`), otherwise English; and `languageStorage` remembers the choice under `playliberty.language`. `I18nProvider` binds `t` to the active catalog, remembers a choice and writes the page's `lang`, wrapping the router in `main.tsx` and the render helpers of the tests it reaches. The library header gains `LanguageMenu`, a globe opening a two-row menu with the active row checked and the trigger named by `language.label`, and the library page, its skeleton and the empty gallery render through `t`.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
