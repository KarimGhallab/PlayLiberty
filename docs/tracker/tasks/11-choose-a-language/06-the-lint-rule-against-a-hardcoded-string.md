# 06: The lint rule against a hardcoded string

**What to build:** the lint rule that rejects a hardcoded user-facing string in JSX and the known label props,
with an allowlist for non-copy strings, so new copy cannot bypass the catalog. A translated string passes and a
hardcoded one fails.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A hardcoded user-facing string in JSX, or in a known label prop, fails lint.
- [ ] A string that comes from the catalog passes, and the allowlist covers the non-copy strings that must stay.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
