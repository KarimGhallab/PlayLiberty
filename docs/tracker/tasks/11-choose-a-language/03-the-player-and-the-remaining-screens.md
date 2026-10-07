# 03: The player and the remaining screens

**What to build:** the player and the remaining shared surfaces read in the chosen language: the player bar and
its transport labels, the volume control and its notice, the shared dialog, empty-state and toast scaffolding,
and the not-found screen.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Every user-facing string in the player and the shared surfaces comes from the catalog and reads in the
      chosen language.
- [ ] The existing player and shared-component tests keep passing in `en`.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
