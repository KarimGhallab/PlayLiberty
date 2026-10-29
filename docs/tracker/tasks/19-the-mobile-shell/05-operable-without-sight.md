# 05: The shell is operable without sight and with large text

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-sheet-names-you.md), [`02`](02-sign-out-and-language.md)

## What to build

The app's accessibility baseline, applied to the surfaces the shell owns: the signed-out state, the library header,
the account sheet and the not-found body. Every control carries an accessible name and a role, including the
not-found body's way home. Every target meets 44 by 44 points. State is announced in words, not only in colour. The
sheet honours the system's reduced motion. Font scaling is capped only where a fixed layout would break, and
nowhere else.

The web's focus ring and keyboard contract are dropped deliberately: touch and the platform's screen-reader actions
replace them, and every control still carries a name and a role.

## Acceptance criteria

- [ ] TalkBack traversal of the four surfaces announces a name and a role for every control.
- [ ] Every target measures at least 44 by 44 points.
- [ ] A selected language is announced as selected, and a disabled action as disabled.
- [ ] At a 200% font scale nothing in the four surfaces clips or overlaps.
- [ ] With reduced motion on, the sheet does not slide.
- [ ] No font-scale cap is applied where the layout can grow.

## Verification

`pnpm --filter @playliberty/mobile run test` asserts the accessible names and roles of each surface. On
`emulator-5554`: a TalkBack pass over the four surfaces, a 200% font scale pass, and a reduced motion pass.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
