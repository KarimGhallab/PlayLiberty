# 07: The documentation the change owes

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).
**Status:** resolved

## Outcome

Done. The documentation the change owes is in place.

- [`The client owns user-facing copy`](../../../DESIGN.md#the-client-owns-user-facing-copy) records the decision: the client owns every user-facing
  sentence, `@playliberty/i18n` is the shared package, the runtime is hand-rolled, and the server returns
  codes and parameters. It links the spec and the records it builds on, and names twelve rejected alternatives.
- The spec's Implementation Decisions now links [`The client owns user-facing copy`](../../../DESIGN.md#the-client-owns-user-facing-copy)
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
