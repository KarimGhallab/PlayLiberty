# 04: The sync line, the state words and the counts

**What to build:** the sync line, the state words and the counts read in the chosen language. The locale-aware
formatters move out of `ui-foundation` into `@playliberty/i18n`: relative time, last synced, the sync and track
state words, the provider name, and the track count with its unit. `ui-foundation` keeps only the language-free
primitives (duration, tone, sleeve, easing). A playlist line and a track count read French.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The locale-aware formatters live in `@playliberty/i18n` and are covered by its unit tests, and
      `ui-foundation` exports only the language-free primitives.
- [ ] The playlist header's sync line, the sync summary, the track row's state and the track count read in the
      chosen language.
- [ ] The existing formatter tests keep passing in `en`.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
