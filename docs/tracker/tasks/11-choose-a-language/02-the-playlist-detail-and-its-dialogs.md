# 02: The playlist detail and its dialogs

**Status:** resolved

## Outcome

The detail route's own copy and its dialogs read through the catalog. The detail page's own strings come from the catalog: the way home, the add control, the loading and read-failure sentences, the empty-list sentence, the deferred delete and remove messages, the setting's refusal and notice, and the toast's cancel. `TrackRow` reads its play and pause labels, its action label, its three lane items and its full-length policy from the catalog, and `AddTrackDialog`, `RenamePlaylistDialog`, `SharePlaylistDialog` and `PlaylistSkipSetting` read their titles, descriptions, labels, verbs, refusals and level words from the catalog. The shared components the detail draws (`PlaylistHeader`, `EmptyState`, `ReadFailure`, `UndoToast`, `NoticeToast`, `PlaylistNotFound`) and the locale-aware formatters (`trackStateLabel`, the sync words, the counts) are owned by tickets 03 and 04, so the route is fully translated once those land; the add-track dialog's example-URL placeholder stays a literal, because it is not copy.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
