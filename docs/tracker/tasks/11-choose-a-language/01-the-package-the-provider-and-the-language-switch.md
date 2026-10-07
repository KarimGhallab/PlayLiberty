# 01: The package, the provider and the language switch

**What to build:** `@playliberty/i18n` exists with the typed runtime, the `en` and `fr` catalogs, the locale
resolution and the React provider, and the web client renders through it. A globe button in the library header
opens a menu of `English` and `Français` with the active row checked. Choosing a language changes the library
screen at once, the choice survives a reload, and the document's `lang` follows. The throwaway prototype under
the web client's source is deleted. This is the tracer bullet: it lands the package and the pattern every later
ticket extends.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The package builds and its unit tests cover resolution (an explicit choice beats the browser preference, a
      regional preference resolves to its base, an unsupported language falls back to `en`), interpolation, and
      plural selection.
- [ ] `en` defines the `Messages` type and `fr` is typed as it, so a missing French key fails the type check.
- [ ] The web client renders through the provider, and its existing tests keep asserting the same English
      sentences.
- [ ] The library header carries a globe button whose menu holds `English` and `Français` with the active row
      checked.
- [ ] Choosing a language changes the library screen without a reload and survives a reload.
- [ ] The document's `lang` attribute follows the choice.
- [ ] The prototype route and its files are deleted, and the router is back to its two routes.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
