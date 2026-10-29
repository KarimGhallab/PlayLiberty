# 05: The shell is operable without sight and with large text

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-sheet-names-you.md), [`02`](02-sign-out-and-language.md)

## Outcome

The four surfaces are now components with their own tests, so each one's accessible tree can be asserted instead of
only seen: `SignedOut`, `LibraryHeader` and `NotFound`. The library route keeps the session and the account read and
renders them.

Every control carries a name and a role. The language in force is announced as selected through
`accessibilityState`, and the sign-in action is announced as disabled while it runs. Every action now sets
`minWidth` beside `minHeight` to the 44 point token, so the target is guaranteed in both directions rather than left
to the label's width.

The not-found body was the one real gap: its way home was a bare `Link`, which exposed no role and a target below
44 points. It is now a named control with a 44 point box. Its copy moved from `notFound`, which speaks about a
playlist, to `notFoundPage`, which is what an unknown path is.

The sheet's reduced motion is asserted at the modal: with the system setting on, `animationType` is `none`.

Signing out with the sheet open left the sheet's state true, so it reappeared after signing in again. The route now
closes it before signing out.

## Verification

- Mobile 63 tests across 14 suites. The new assertions cover the signed-out action's name, role, target, busy state
  and disabled state, the library header's door, the not-found heading and way home, the sheet's heading, its
  selected language, and the sheet's animation with reduced motion on.
- `pnpm run build` and `pnpm run lint:check` pass.
- On `emulator-5554` at a 200% font scale, all four surfaces were drawn without clipping or overlap, and every
  control measured 44 points: the Account door at 363 by 115 pixels, the way home at 541 by 116, the sheet's rows
  at full width and 116 high.
- With TalkBack enabled, traversal focused the Account door and then the sheet's name, and the accessibility tree
  reported `android.widget.Button` with a name for every control, with `selected` on the language in force.
- With the animator duration scale at zero, the sheet still opened.

## Notes

- `accessibilityRole="link"` was tried first for the way home. Android maps that role to a plain `View`, so a screen
  reader would not announce it as a link. `button` is the role that actually reaches the reader on this platform.
- The 200% pass needed no font-scale cap: the fixed line heights on the screen frame scale with the font, so nothing
  clipped. No cap was added anywhere.
- Enabling TalkBack raised a system notification-permission dialog that covered the app. It was dismissed, the
  service was disabled, and the font and animator scales were restored to their defaults afterwards.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
