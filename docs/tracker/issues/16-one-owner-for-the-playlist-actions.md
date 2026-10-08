# 16: One owner for the playlist actions

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** The playlist's four actions (share, rename, sync, delete) are wired once in the library item and once in the detail page, and the owner/writer rule that decides which actions a playlist offers is derived in the header and again at each consumer, so the rule can drift.

**Current behavior:**
The overflow menu's items are built in the playlist header from `playlist.access`, so the access rule lives there. The effects the items trigger (the share and rename dialogs, the sync mutation, the deferred delete) are wired separately in the library item and the detail page, each with its own defer window, its own navigation and its own copy. The library row and the detail page therefore re-implement the same four wirings, and a change to who may do what must be made in the header and at both consumers.

**Desired behavior:**
One module owns a playlist's actions: the access rule, the menu model it produces, the dialogs, and the mutations. The header renders the menu the module returns; the library item and the detail page hand the module a playlist and receive the menu and the wiring, and neither re-derives the rule nor re-wires the effects. The behaviour is otherwise identical: the same items appear for the same access, the dialogs open, the sync runs, and the delete keeps its undo window and its navigation.

**Key interfaces:**

- The module's interface takes a playlist (or its id and access) and returns the menu model plus the action wiring; the header consumes the menu model, the pages consume the wiring.
- The undo window and the post-delete navigation stay with the consumer, because they differ (the library defers in place, the detail navigates away).
- `PlaylistHeader`'s menu props today are one callback per action; the module replaces that fan-out with the model.

**Acceptance criteria:**

- [ ] The owner/writer rule is derived in one module and nowhere else.
- [ ] The library row and the detail page share the action wiring; neither re-implements it.
- [ ] The menu shows the same items for the same access as today, on both surfaces.
- [ ] Share, rename, sync and delete behave as today, including the undo window and the detail's navigate-away on delete.
- [ ] Tests cover the rule at the module's interface and keep the existing page-level action tests passing.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The row/card split of the header (issue 17), which restructures the same module.
- Adding new actions, or moving the add-track flow, which is detail-only today.
- The problem-copy mapping (issue 21).

## Observed

- `PlaylistHeader.tsx` builds the menu items from `playlist.access` in a local IIFE, so the rule lives in the header.
- `PlaylistListItem.tsx` and `PlaylistDetailPage.tsx` each wire sync, rename, share and delete, with different defer and navigation.
- `PlaylistListItem.tsx` has no test of its own; its gating and its delete action are covered only through `LibraryPage.test.tsx`.

## Expected

A playlist's actions have one owner: the rule, the menu and the effects live in one module, and the header and the two pages cross one interface.

## Evidence

- `PlaylistHeader.tsx`: the `menuItems` IIFE, by `playlist.access`.
- `PlaylistListItem.tsx` and `PlaylistDetailPage.tsx`: the four action wirings, each re-derived.
- Architecture review, candidate 1, "Give the playlist actions one owner".
