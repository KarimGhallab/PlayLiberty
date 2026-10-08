# 04: The sync line, the state words and the counts

**What to build:** the sync line, the state words and the counts read in the chosen language. The locale-aware
formatters move out of `ui-foundation` into `@playliberty/i18n`: relative time, last synced, the sync and track
state words, the provider name, the track count with its unit, and duration. `ui-foundation` keeps only the
language-free primitives (tone, sleeve, easing). A playlist line and a track count read French.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] The locale-aware formatters live in `@playliberty/i18n` and are covered by its unit tests, and
      `ui-foundation` exports only the language-free primitives.
- [x] The playlist header's sync line, the sync summary, the track row's state and the track count read in the
      chosen language.
- [x] The existing formatter tests keep passing in `en`.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

## Outcome

Done. The locale-aware formatters moved into the package and the sync line, the state words and the counts read
through the catalog.

- `@playliberty/i18n` gained `formatters/`: `formatRelativeTime`, `formatLastSynced`, `syncStateLabel`,
  `trackStateLabel`, `providerLabel`, `trackCountUnit` and `formatTrackCount`, each taking the translator so the
  sentence and its plural come from the active catalog. The package now depends on `@playliberty/contracts` for
  the status and provider enums.
- `ui-foundation` exports only the language-free primitives (`trackTone`, `sleeveIndex`,
  `standardEasingBezier`); its formatter tests are now the duration ones, and the moved tests live in the
  package. `formatDuration` moved into the package too, so every formatter the clients call is in one place.
- `PlaylistHeader` (state word, sync time, count unit), `TrackRow` (state word), `SyncSummary` (the four count
  words, the in-flight line, the stamp) and `SyncError` (the sentence, the reassurance, the retry and the reveal)
  read through the catalog. `SyncError` gained a `provider` prop, because its sentence and its reassurance name
  the provider.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (i18n 30, ui-foundation 9, server 275, web
365). The formatter tests pin the English strings and one sync line and one count in French, the two the ticket
names. Not committed.
