# 63: One menu renderer and one door rule

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`apps/web/src/shared/components/Menu/Menu.tsx` is the one renderer for the three menus. It takes `MenuItem[]` (label, icon, destructive, disabled, checked, onSelect), `MenuVariant.Item` or `MenuVariant.Radio`, the trigger ref, the caller's class names, and an optional `divided` flag. It owns `role="menu"`, `role="menuitem"` or `menuitemradio`, `aria-checked`, `tabIndex={-1}`, `data-destructive`, the `<hr>` before a destructive item, and the close-then-return-focus contract. `usePlaylistHeader`, `TrackRow` and `LanguageMenu` pass their own item lists and styles; no menu markup or `closeMenu` is left in any of them.

`playlistDoorProps(pending)` lives beside `playlistDoor` in `playlistDoor.ts`. The header seam returns it as `door`, and the name link plus the three cover links spread it: `aria-disabled`, `tabIndex=-1` and the `preventDefault` guard now come from one rule.

`Menu.test.tsx` covers the shared roles, the divider, the radio state, item selection returning focus, arrow navigation skipping a disabled item, and Escape. `playlistDoor.test.ts` covers the live and pending props.
