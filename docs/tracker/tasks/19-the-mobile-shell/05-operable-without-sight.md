# 05: The shell is operable without sight and with large text

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

**Constraints:** `accessibilityRole="button"` is the role Android announces; `link` maps to a plain `View`. No font-scale cap was needed at 200%: the fixed line heights scale with the font, and nothing clipped.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
