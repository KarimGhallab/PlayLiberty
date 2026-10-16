# 02: The pinned section and the pin in the item's menu

**Status:** resolved

## Outcome

The gallery draws two lists over the one read: a labelled `<section>` holding the items whose `pinned` flag is set, and the existing `<ul>` holding the rest, so the grouping is real to a screen reader, with the heading the section's accessible name through `aria-labelledby`. The page filters on the flag and never sorts, so the section's order is the read's and the list below keeps the order it had; the section carries no count, stands `--space-7` from the list, and is not drawn at all while nothing is pinned, and the loading state is untouched. `useUpdatePin` flips the flag on the cached gallery and restores the snapshot on a failure, then invalidates the gallery read, and `usePlaylistActions` owns the write as the menu's first item: an owner's and a writer's carry the rest of their actions beside it, and a reader's carries Pin or Unpin alone, because visibility is the whole of what pinning needs. The detail passes no pin, so its menu is unchanged, the copy is `library.pinned`, `library.pinFailed`, `header.pin` and `header.unpin`, with the French heading inflected (`Épinglées`, `Épingler`, `Désépingler`), and a failed pin draws the notice with the server's problem sentence under it on the same self-withdrawing window the other notices use.

See [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md).
