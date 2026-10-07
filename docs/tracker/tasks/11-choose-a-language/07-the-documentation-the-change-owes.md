# 07: The documentation the change owes

**What to build:** the documentation the change owes. ADR `0014` records that the client owns user-facing copy,
the shared `@playliberty/i18n` package and the hand-rolled runtime, with the alternatives it rejects. The
glossary gains the `Language` and `Locale` rows. The design system gains a record for the language button and
its menu, and the map and inventory link it.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] ADR `0014` exists, is linked from the decisions it records, and names the alternatives it rejects.
- [ ] The glossary has the `Language` and `Locale` rows, and any term they are easy to mix up with.
- [ ] The design system has the language button record, and the map links it.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
