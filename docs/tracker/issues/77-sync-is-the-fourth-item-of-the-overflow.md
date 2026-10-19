# 77: Sync is the fourth item of the overflow

**State:** `needs-triage`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Synchronising a playlist, the product's recurring task, is the fourth item of a five-item overflow menu, while the detail's header promotes "Ajouter une piste" and the gallery shows only a state word.

**Current behavior:**
`playlistActions.tsx` pushes pin, share, rename, `syncItem()`, delete for an owner. The gallery and the detail render that menu behind a `...` control. A user who wants a stale playlist refreshed must open the menu and recognise "Synchroniser".

**Desired behavior:**
Sync is reachable in one press from the surfaces that show a playlist's health: a named control beside the sync state on the detail, and either the same or a clear menu entry on the gallery. Its in-flight state is visible where it was pressed.

**Key interfaces:**

- The `sync` item keeps its endpoint, its disabled-while-pending rule and its live-event updates.
- The header's existing action row is the natural home on the detail.

**Acceptance criteria:**

- [ ] A writer can start a sync from the detail without opening the overflow.
- [ ] The control reflects a run in flight and does not double-fire.
- [ ] The overflow keeps its other items and their order.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The sync pipeline, the worker and the progress surface.

## Observed

- The owner menu order is pin, share, rename, sync, delete.
- The detail header's only action is "Ajouter une piste".

## Expected

- The most frequent action of a playlist is not the least visible one.

## Evidence

- `apps/web/src/shared/playlistActions/playlistActions.tsx:96-135`.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2.
