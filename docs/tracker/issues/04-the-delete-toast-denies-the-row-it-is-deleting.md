# 04: The delete toast denies the row it is deleting

**State:** resolved
**Category:** `bug`

## Agent Brief

**Category:** bug
**Summary:** A deferred destructive action leaves its target fully live for the whole undo window, so the
toast claims a deletion the screen denies. The library's playlist row is the named instance; the detail's
header during its delete window and the detail's track rows during a deferred removal fail the same way.

**Current behavior:**
Pressing a destructive control does not call the server; it opens the undo window and lifts a
`PendingAction` to the owning page. Nothing marks the target: the library's playlist row keeps its door,
shuffle and overflow live, the detail's header stays live during its own delete window, and a track row
stays live while its removal waits. A person can open, rename, shuffle or delete again the very thing the
toast says is going.

**Desired behavior:**
While an action is pending, its target is marked pending: dimmed, `aria-busy`, and with every control and
door it offers disabled, so it cannot be opened, renamed, shuffled, re-deleted, or have its track removed
again. The mark lasts exactly the window. Cancelling lifts it and the target is fully live again; letting
the window close commits as today, with the library invalidating and the detail navigating home on success.
When a second action replaces the first, the first target's mark lifts with its displaced window, because
its commit will not run.

**Key interfaces:**

- `PendingAction` carries only `message`, `detail` and `commit`, and `detail` is a name, which is not
  unique. The pending action must carry the id of its subject (the playlist id, or the track id) so the
  surface can match the exact target. Add it to `PendingAction`, or have the surface record it when it
  defers.
- `PlaylistHeader` needs a pending signal that dims the row, sets `aria-busy`, and disables every control
  and door it offers (the row press and its links, the shuffle, the play, the overflow), using the existing
  `--opacity-disabled` token.
- `TrackRow` needs the same signal for a deferred removal.
- The deferred-action hook already exposes `pending` and `replaced`; the surfaces derive the pending target
  from them and need no new window state.

**Acceptance criteria:**

- [x] Pressing Delete on a library row marks that row pending for the window: dimmed, `aria-busy`, its
      door, shuffle and overflow disabled. Cancel lifts the mark and the row is fully live.
- [x] Pressing Delete on the detail's header marks the header pending for its window the same way.
- [x] Removing a track on the detail marks that track row pending for its window the same way.
- [x] A pending target cannot be opened, renamed, shuffled, re-deleted, or have its track removed again.
- [x] When a second delete replaces the first, the first target's pending mark lifts and only the current
      window's target is marked; the existing replace and displaced-intent behaviour is unchanged.
- [x] Each affected surface has a test asserting the pending mark, the disabled controls, and the lift on
      Cancel; the existing deferred-delete tests keep passing.
- [x] The design records for the affected components describe the pending state.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Removing the row optimistically and restoring it on Cancel. The treatment chosen is dim, busy, disable.
- The undo window's duration and the toast's copy, which are unchanged.
- Localization. The new copy stays plain English like the surrounding code; wiring it into the catalog
  belongs to spec 11.
- Any change to what the commit does. The delete and removal semantics are unchanged.

## Outcome

Done. A deferred destructive action marks its target for the whole window, so the screen stops claiming a
deletion it is not showing.

- `PendingAction` carries the subject's `id` and `sameIntent` compares it, so two same-named playlists are
  two intents and a replacement is detected even when the names collide.
- `PlaylistHeader` takes `pending`: the row dims to `--opacity-disabled`, carries `aria-busy`, and its door
  (the row press and both links), its play, its shuffle and its overflow are disabled. `TrackRow` takes the
  same signal for its lane and its play layer.
- The library passes `pending` from `deferred.pending?.id`; the detail's header and its track rows read the
  playlist id, and a row also reads its own track id. A playlist's own delete therefore marks its header and
  every one of its track rows, because the whole playlist is going. Cancel lifts the mark; a replacement
  lifts the first target's mark and leaves only the current window's target marked.
- Tests: the hook (the id and the same-name replacement), the header and the track row (the mark and the
  disabled controls), and the library and the detail (the mark and the lift on Cancel). The existing
  deferred-delete tests still pass.
- Records: [`playlist-header.md`](../../design-system/components/playlist-header.md) and
  [`track-row-play-control.md`](../../design-system/components/track-row-play-control.md) describe the
  pending state.

Verification: `pnpm run lint`, the full unit suite (web 335 tests), the e2e suite (27 tests) and
`node docs/design/scripts/validate-design-tokens.cjs` all pass. `pnpm run build` is blocked only by the
concurrent session's untracked prototype (`src/prototype/library-ambience/`), whose `tsc` error is the sole
one; this change's files compile cleanly. Not committed.

## Observed

Deleting a playlist opens the undo window and the toast says "Deleting playlist Focus", while the Focus
row stays fully rendered, hoverable and clickable for the whole window. The screen and the toast disagree.
If the window is missed, the row simply disappears with no confirmation.

- [`PlaylistListItem.tsx:84-93`](../../../apps/web/src/views/library/PlaylistListItem.tsx) defers the
  delete with `message: 'Deleting playlist'`.
- [`LibraryPage.tsx:153-164`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.tsx) draws the
  `UndoToast` for the pending window.
- Nothing marks the row pending: the list is invalidated only when the deferred commit runs, so the row is
  still the live item until then.

## Expected

The row reflects its pending state for the window: dimmed, `aria-busy`, its controls disabled, or removed
optimistically and restored on cancel. Either way the screen stops claiming a deletion it is not showing,
and a user cannot open or rename a playlist that is about to vanish.

## Evidence

- Live, 2026-10-05: pressing Delete on Focus showed "Deleting playlist Focus" over an unchanged, still
  interactive row.
- `useDeferredAction` owns the window and already exposes `pending`, so the page can pass that down to the
  item.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Priority Issue P2 (and the emotional
  journey's delete valley).
