# 07: The documentation the change owes

**What to build:** the documentation the change owes. ADR `0014` records that the client owns user-facing copy,
the shared `@playliberty/i18n` package and the hand-rolled runtime, with the alternatives it rejects. The
glossary gains the `Language` and `Locale` rows. The design system gains a record for the language button and
its menu, and the map and inventory link it.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] ADR `0014` exists, is linked from the decisions it records, and names the alternatives it rejects.
- [x] The glossary has the `Language` and `Locale` rows, and any term they are easy to mix up with.
- [x] The design system has the language button record, and the map links it.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

## Outcome

Done. The documentation the change owes is in place.

- `docs/adr/0014-client-owns-user-facing-copy.md` records the decision: the client owns every user-facing
  sentence, `@playliberty/i18n` is the shared package, the runtime is hand-rolled, and the server returns
  codes and parameters. It links the spec and the ADRs it builds on, and names twelve rejected alternatives.
- The spec's Implementation Decisions now links [`0014`](../../../adr/0014-client-owns-user-facing-copy.md)
  rather than naming it as text.
- `docs/GLOSSARY.md` gains a `Language` section with the `Language` and `Locale` rows, and two mix-up bullets:
  Language against Locale, and interface language against user content.
- `docs/design-system/components/language-menu.md` records the language button and its menu: the icon-only
  trigger and its accessible name, the radio group and the held check, the endonyms, and the light-dismiss
  focus behaviour. `docs/DESIGN.md` links it from the map and the component inventory.

One finding is recorded in the design record rather than fixed here: the trigger's globe is drawn at 18px and
the menu's check at 14px, neither a step in the icon scale, whose values for an icon-only control and a mark
inside a control are `--icon-md` 20px and `--icon-sm` 16px. The record holds the component to those two values.

Verification: `pnpm run design:check` OK, `pnpm run lint` clean, `pnpm run build` clean, `pnpm run test:unit`
all pass (i18n 16, server 275, web 365). Not committed.
