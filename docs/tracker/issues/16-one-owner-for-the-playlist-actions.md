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

- [x] The owner/writer rule is derived in one module and nowhere else.
- [x] The library row and the detail page share the action wiring; neither re-implements it.
- [x] The menu shows the same items for the same access as today, on both surfaces.
- [x] Share, rename, sync and delete behave as today, including the undo window and the detail's navigate-away on delete.
- [x] Tests cover the rule at the module's interface and keep the existing page-level action tests passing.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The row/card split of the header (issue 17), which restructures the same module.
- Adding new actions, or moving the add-track flow, which is detail-only today.
- The problem-copy mapping (issue 21).

## Outcome

Done. A playlist's actions have one owner, and the header no longer derives the rule.

- A new `usePlaylistActions(playlistId, playlist, options)` module owns the owner/writer rule, the menu model it produces, the rename and share dialogs, and the sync, rename and delete mutations. It returns `menu`, `dialogs`, the shared `syncNow`/`syncing`, and `canWrite`.
- `PlaylistHeader` no longer takes `onSync`, `onRename`, `onShare`, `onDelete` or `syncing`; it takes `menu`, the model the module builds, and draws no overflow for an empty one. The `MenuItem` interface and the `menuItems` IIFE are gone, and each item carries its own `disabled` (the sync item while a run is in flight).
- `PlaylistListItem` and `PlaylistDetailPage` both call the module; neither derives the rule nor wires the effects. The item's dialogs and the detail's rename and share dialogs now come from `dialogs`.
- What stays with the consumer is what genuinely differs: the library's one undo window and the detail's navigate-home on a committed delete, which the module takes as `defer`, `deleteMessage` and `onDeleted`.
- The detail's `canWrite` now comes from the module, so the owner/writer predicate is written once; its `SyncError` retry and `EmptyState` sync share the module's one sync mutation, so `syncing` cannot diverge between the menu and those controls.

Tests: `playlistActions.test.tsx` covers the rule at the module's interface (owner four items, writer Sync now alone, reader none, nothing before the playlist loads, the delete's deferral with the surface sentence and the name, and no delete for a writer). `PlaylistHeader.test.tsx` now hands the header a menu model; the page-level action tests are unchanged and pass.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 372, server 281, i18n 39, ui-foundation 6, youtube 22, tokens 3) pass. Not committed.

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
