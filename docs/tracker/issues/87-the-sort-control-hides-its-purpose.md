# 87: The sort control hides its purpose

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The sort control shows only its current value, "Ordre de la playlist"; the fact that it is a three-way sort exists only in its `aria-label`, so a sighted user cannot tell what the control is.

**Current behavior:**
`PlaylistSortControl` labels the trigger with the current option (`detail.sortPlaylist`) and carries `detail.sortBy` ("Trier par") only in the `aria-label`.

**Desired behavior:**
The control reads as a sort to a sighted user: a visible "Trier par" prefix, or a label that names the choice as a choice.

**Key interfaces:**

- The three orders and the open rule are unchanged.
- The i18n strings already carry both phrases.

**Acceptance criteria:**

- [ ] A sighted user can tell the control sorts the list before opening it.
- [ ] The aria-labelledby and the value stay correct.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The orders themselves.

## Observed

- The trigger reads `Ordre de la playlist` with a sort glyph; the label is aria-only.

## Expected

- The control's purpose is visible, not inferred.

## Evidence

- `apps/web/src/shared/components/PlaylistSortControl/PlaylistSortControl.tsx`.
- `packages/i18n/src/fr.ts:57-60`.
- Impeccable critique of `apps/web`, 2026-10-19, minor observations.
