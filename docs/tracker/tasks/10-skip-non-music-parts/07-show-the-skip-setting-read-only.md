# 07: Show the skip setting read-only

**What to build:** A playlist shows whether it skips the non-music parts of its videos, read-only, with one line
explaining what the setting does and why it is fixed at creation and shared between playlists. It is never an
editable control, because changing it later could not change tracks already fetched and could not re-fetch them
either. The app has no playlist settings surface today, so this ticket settles where the read-only setting lives
and records it in the design system if it introduces a surface.

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The playlist shows its setting read-only with the one-line explanation.
- [ ] The setting is not an editable control anywhere.
- [ ] The placement is recorded in the design system.
- [ ] axe and the web unit suite pass.

**Verification:** the web unit suite, `pnpm run build`, `pnpm run lint` and `pnpm run design:check`.
