# 06: The add-playlist dialog carries the skip setting

**What to build:** The dialog that creates a playlist gains a "Skip non-music parts" control, on by default, so
the common case gets the behaviour without hunting for a setting. A listener who wants a source whole turns it
off before adding, and the chosen value travels with the create request. This is the listener's only choice
about the setting, because the server freezes it at creation.

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The control is drawn, on by default.
- [ ] Turning it off sends the value false with the create request; leaving it on sends true.
- [ ] The dialog's field and verbs are otherwise unchanged.
- [ ] axe and the web unit suite pass.

**Verification:** the web unit suite, `pnpm run build`, `pnpm run lint` and `pnpm run design:check`.
