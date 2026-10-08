# 02: The playlist detail and its dialogs

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).
**Status:** resolved

## Outcome

Done. The detail route's own copy and its dialogs read through the catalog.

- The detail page's own strings come from the catalog: the way home, the add control, the loading and
  read-failure sentences, the empty-list sentence, the deferred delete and remove messages, the setting's
  refusal and notice, and the toast's cancel.
- `TrackRow` reads its play and pause labels, its action label, its three lane items and its full-length policy
  from the catalog.
- `AddTrackDialog`, `RenamePlaylistDialog`, `SharePlaylistDialog` and `PlaylistSkipSetting` read their titles,
  descriptions, labels, verbs, refusals and level words from the catalog.

The shared components the detail draws (`PlaylistHeader`, `EmptyState`, `ReadFailure`, `UndoToast`,
`NoticeToast`, `PlaylistNotFound`) and the locale-aware formatters (`trackStateLabel`, the sync words, the
counts) are owned by tickets 03 and 04, so the route is fully translated once those land. The add-track dialog's
example-URL placeholder stays a literal, because it is not copy.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (i18n 16, server 275, web 365). The
existing detail, dialog and track-row tests pass in `en` unchanged; their render helpers now wrap the provider.
Not committed.
