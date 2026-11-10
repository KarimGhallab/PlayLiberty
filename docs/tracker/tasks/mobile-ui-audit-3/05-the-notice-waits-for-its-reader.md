# 05: The notice waits for its reader

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)

## Outcome

The notice body is the alert and carries the `extend` accessibility action; the action restarts the window, so a
reader asking for more time keeps the message. A visible close control is a sibling of the body, so TalkBack reaches
both, and it leaves with the same fade. The four-second default, the swipe and the live region are unchanged.

Tests cover the close, the default withdrawal and the reset window. The emulator's recording of an egress check shows
the notice with its close control, and the detail wraps under the message.
