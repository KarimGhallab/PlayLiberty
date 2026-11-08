# 02: The tablet layout stops stretching the phone frame

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)

## Outcome

The content column is capped at 720 and centred. The `Screen` frame, the detail's list and its pending and error
states, the identity header and its skeleton all read the same column, so the chrome and the rows share one measure.
The gallery's column math reads the capped width, so its three columns still fill the content box. The player bar
stays full-bleed as the persistent overlay.

At 800dp the gallery and the detail sit in a centred 720 column; the detail's header backdrop stays full-bleed. At
411dp nothing moves. `docs/DESIGN.md` records the cap. The column rule has its own test, and the gallery test asserts
the capped box.
