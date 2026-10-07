# 02: The playlist detail and its dialogs

**What to build:** the playlist detail screen and its dialogs read in the chosen language: the track list and
its empty and error states, the add-track dialog, the rename dialog, the share dialog, the skip setting, the
track row's controls and state text, and the detail's undo and notice toasts.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Every user-facing string on the detail route and in its dialogs comes from the catalog and reads in the
      chosen language.
- [ ] The existing detail, dialog and track-row tests keep passing in `en`.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
