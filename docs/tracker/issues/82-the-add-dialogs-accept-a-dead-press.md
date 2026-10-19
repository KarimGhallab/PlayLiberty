# 82: The add dialogs accept a dead press

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Two add dialogs let the user press a primary button that does nothing: "Ajouter" in the add-track dialog is enabled with no playlist chosen and returns early with no message, and the add-playlist primary is enabled on an empty field while a scrim click discards a paste.

**Current behavior:**
`AddTrackDialog.submit` returns early when `chosen.length === 0` and the button is not disabled, so the press is silent. `AddPlaylistDialog` renders its primary enabled against an empty URL field, and `Dialog`'s scrim `onMouseDown` closes the dialog, discarding a typed URL with no confirmation.

**Desired behavior:**
A press that can do nothing is either disabled or explained: the add-track primary is disabled until a playlist is chosen, or names the missing choice. A scrim click on a dirty form asks before discarding.

**Key interfaces:**

- The dialogs keep their validation messages and their submit paths.
- `Dialog.onRequestClose` stays the single close seam.

**Acceptance criteria:**

- [ ] Pressing the add-track primary with no playlist chosen produces a message or is not possible.
- [ ] The add-playlist primary reflects the empty-field state.
- [ ] A scrim click with a typed value does not discard it silently.
- [ ] A test holds the no-playlist press.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The server's URL validation and the create mutation.

## Observed

- `AddTrackDialog.tsx:96-100` returns early with no message and the button is enabled.
- The add-playlist primary is enabled with an empty field.

## Expected

- No press at a dialog's primary can end in nothing with no explanation.

## Evidence

- `apps/web/src/shared/components/AddTrackDialog/AddTrackDialog.tsx:96-117,140-143`.
- `apps/web/src/views/library/AddPlaylistDialog/AddPlaylistDialog.tsx`.
- `apps/web/src/shared/components/Dialog/Dialog.tsx:158-165`.
- Impeccable critique of `apps/web`, 2026-10-19, minor observations.
