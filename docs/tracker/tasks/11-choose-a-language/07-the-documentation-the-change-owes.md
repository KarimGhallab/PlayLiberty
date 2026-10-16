# 07: The documentation the change owes

**Status:** resolved

## Outcome

The client-owns-copy decision is recorded: the client owns every user-facing sentence, `@playliberty/i18n` is the shared package, the runtime is hand-rolled, and the server returns codes and parameters; the record links the spec and the records it builds on, and names twelve rejected alternatives. The spec's Implementation Decisions now records the client-owns-copy decision rather than naming it as text, and `docs/GLOSSARY.md` gains a `Language` section with the `Language` and `Locale` rows and two mix-up bullets, Language against Locale and interface language against user content. A language-menu record covers the language button and its menu: the icon-only trigger and its accessible name, the radio group and the held check, the endonyms, and the light-dismiss focus behaviour. One finding was recorded rather than fixed: the trigger's globe is drawn at 18px and the menu's check at 14px, neither a step in the icon scale, whose values for an icon-only control and a mark inside a control are `--icon-md` 20px and `--icon-sm` 16px, and the component is held to those two values.

See [`11-choose-a-language`](../../specs/11-choose-a-language.md).
