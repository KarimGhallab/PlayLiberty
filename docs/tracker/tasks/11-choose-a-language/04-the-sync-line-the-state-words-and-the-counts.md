# 04: The sync line, the state words and the counts

**Status:** resolved

## Outcome

The locale-aware formatters moved into `@playliberty/i18n`, which gained `formatters/`: `formatRelativeTime`, `formatLastSynced`, `syncStateLabel`, `trackStateLabel`, `providerLabel`, `trackCountUnit` and `formatTrackCount`, each taking the translator so the sentence and its plural come from the active catalog; `formatDuration` moved there too, so every formatter the clients call is in one place, and the package now depends on `@playliberty/contracts` for the status and provider enums. `ui-foundation` exports only the language-free primitives (`trackTone`, `sleeveIndex`, `standardEasingBezier`), and its formatter tests are now the duration ones. `PlaylistHeader` (state word, sync time, count unit), `TrackRow` (state word), `SyncSummary` (the four count words, the in-flight line, the stamp) and `SyncError` (the sentence, the reassurance, the retry and the reveal) read through the catalog. `SyncError` gained a `provider` prop, because its sentence and its reassurance name the provider.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
