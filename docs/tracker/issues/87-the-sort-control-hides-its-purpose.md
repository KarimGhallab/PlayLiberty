# 87: The sort control hides its purpose

**State:** `resolved`
**Category:** `bug`

## Outcome

The trigger now carries a visible `detail.sortBy` prefix before the current order, so a sighted reader sees "Sort by Playlist order" (or "Trier par Ordre de la playlist") before opening the menu. The prefix shares the value's muted resting colour and rises to ink on hover or while the menu is open.

The accessible name is unchanged: the trigger keeps `aria-label` `Sort by: <order>`, and the option list and the `aria-selected` value are untouched. No catalog entry was added; `detail.sortBy` and the three option keys already carried both phrases.

`PlaylistSortControl.test.tsx` adds the visible-prefix assertion. The sort now sits on its own line above the filter chips, so the wider label does not compete with the chip rail for the row.
