# Language menu

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The [library](../screens/library.md) header's language control, and the only place the interface's language is
chosen. A globe button opens a two-row menu, `English` and `Français`, with the active row checked; choosing a
row switches the interface at once and remembers it. It is on the library only, because there is no account
surface and no settings, and the decision that the client owns the copy is
[`0014`](../../adr/0014-client-owns-user-facing-copy.md).

## The trigger

**It is an icon-only control and carries its name.** The button holds a `world` glyph and no visible word, so
its name is on `aria-label`, from `language.label` (`Language`, `Langue`), with `aria-haspopup="menu"` and
`aria-expanded`. An icon is the affordance and never the name ([the icons record](../icons.md)).

**It is a quiet control in the header's actions, before the add button.** A 36px box at `--control-height` on
`--surface-raised`, edged with `--control-border` at `--radius-control`, and the edge takes `--accent` on
hover. It is the same box as the header's other quiet controls, so the header reads as one row of controls
rather than a title with two unrelated things at its right.

**The glyph is `--icon-md`.** That is the step the icons record names for a glyph in an icon-only control, and
the step the playlist header's overflow already uses. The component draws it at 18px today, which is not a
step: 18 is neither `--icon-sm` 16 nor `--icon-md` 20, so the record holds the trigger to `--icon-md` and the
18 is a correction the component owes.

## The menu

**It opens below the trigger, right-aligned, on the overlay tier.** `top: calc(100% + var(--space-2))` and
`right: 0`, at `--z-overlay`, on `--surface-raised` at `--radius-card`. It floats over `--bg` rather than over
the raised header, so it carries a shadow to separate it from the list under it; the system has no shadow
token, so the value is a literal and it is the menu's own.

**It is a radio group, not a menu of commands.** `role="menu"` holds two `role="menuitemradio"` buttons
carrying `aria-checked`, because the two rows are one choice with one current value rather than two actions,
and the trigger says so with `aria-haspopup="menu"`.

**The check holds its box, so neither row shifts.** The active row's tick is `--accent-hover` and the inactive
row's is kept in the layout, toggled by opacity rather than mounted, so choosing a language does not move a
label by a tick's width. It is a mark inside a control, so the icons record's step is `--icon-sm` 16px, and the
component draws 14px: the second correction this record owes.

**The two names are endonyms.** `English` and `Français` are the same in both catalogs, because a language is
named in itself. A translated name would read `Anglais` under French, which names a language in the language
the reader is leaving.

## Behaviour and focus

**A choice switches at once, remembers itself, and closes.** The active catalog changes and every screen
re-renders from it, the choice is written under `playliberty.language`, the page's `lang` follows, and the menu
closes with the keyboard returned to the trigger.

**Escape closes and returns the keyboard to the trigger; a press outside closes without moving focus.** The
menu is a light dismiss: no scrim, so the page behind it stays live, which is right for a two-row choice that
is not a modal task.

## Usage

Do name the trigger on `aria-label`, because it has no visible word. Do keep the check in the layout when it is
not drawn, so the rows never shift. Do keep the language names as endonyms. Do return the keyboard to the
trigger on Escape and on a choice. Do not translate the language names. Do not add a third row, a settings item
or an account item: there is no account surface. Do not put the choice in the URL.

## Not this

A settings surface or an account menu, which the prototype tried and dropped because there is no account, no
settings and no sign out. A row per locale (`English (US)`, `Français (Canada)`): the app supports two
languages and matches a regional tag to its base, so a row is a language and not a locale. A visible word on
the trigger, which would spend the header's width on a control a reader presses rarely.
