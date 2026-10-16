# 02: The pinned section and the pin in the item's menu

**Blocked by:** [`01`](01-the-pin-on-a-playlist.md).
**Status:** resolved

## Outcome

Implemented and verified. The gallery draws two lists over the one read: a labelled `<section>` holding the
items whose `pinned` flag is set, and the existing `<ul>` holding the rest. Each group is its own list, so the
grouping is real to a screen reader, and the heading is the section's accessible name through
`aria-labelledby`. The page filters on the flag and never sorts, so the section's order is the read's and the
list below keeps the order it had. The section carries no count, stands `--space-7` from the list, and is not
drawn at all while nothing is pinned; the loading state is untouched.

`useUpdatePin` flips the flag on the cached gallery and restores the snapshot on a failure, then invalidates
the gallery read so the read's own order settles. The page owns the notice: a failed pin draws
`library.pinFailed` with the server's problem sentence under it, on the same self-withdrawing window the other
notices use. There is no toast on success.

`usePlaylistActions` owns the write, and it is the menu's first item: an owner's and a writer's carry the rest
of their actions beside it, and a reader's carries Pin or Unpin alone, because visibility is the whole of what
pinning needs. The cover control `03` proposed as a second affordance was later superseded, so the menu is the
only one. The detail passes no pin, so its menu is unchanged. The copy is `library.pinned`,
`library.pinFailed`, `header.pin`, `header.unpin`, with the French heading inflected (`Épinglées`, `Épingler`,
`Désépingler`).

The mock handlers gained the pin write, and the design record's menu counts were corrected: the owner's
overflow holds five, a writer's Pin and Sync now, and a reader's Pin and Unpin.

The tests: the library page suite proves the section above the list and the item's absence from it, the rest's
order, the Pin and Unpin labels, the press's request body and the optimistic lift, and the rollback with the
notice and no section; `playlistActions` proves the five-item owner menu, the two-item writer menu, the
reader's pin-only menu, the Pin/Unpin label and the detail's missing pin; `mutationInvalidation` proves the
gallery invalidation.

Verification: `pnpm test:unit` (server 373, web 468, i18n 39, youtube 31, ui-foundation 6, tokens 3),
`pnpm run build` and `pnpm run lint` pass. Not committed.
