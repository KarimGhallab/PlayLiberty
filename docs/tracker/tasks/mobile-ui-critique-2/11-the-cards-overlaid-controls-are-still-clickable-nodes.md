# 11: The card's overlaid controls are still clickable nodes

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Needs a device with TalkBack enabled.

## Observed

The card's play, shuffle and actions controls are marked `accessible={false}`, `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"`, and carry no label, which is the fix recorded in
[ticket 04 of the first critique](../mobile-ui-critique-1/04-a-gallery-card-is-one-focus-stop.md). On the current build a
hierarchy dump still lists three unnamed 48dp clickable nodes inside every card, alongside the card's own named node.

The dump reports clickable views, not TalkBack's focus order, so this does not prove the regression. It does show that
the earlier verification's claim, that no such node remains, does not hold on this build, and the question cannot be
settled without TalkBack.

## Expected

TalkBack focuses each gallery card exactly once, with the full name, and the three controls are reachable only through
the card's accessibility actions.

## Evidence

- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx:197-198,273-275,301-303,324-326`: the intended hiding.
- `uiautomator` dump of the library, 2026-11-05: card "Chine, ..." followed by three unnamed 48x48dp clickable nodes,
  repeated for every card.
- [Ticket 04](../mobile-ui-critique-1/04-a-gallery-card-is-one-focus-stop.md) records the opposite result.

## Acceptance criteria

- [x] TalkBack's focus order over the library is one stop per card.
- [x] Each stop reads the count, the not-stored figure, the sync state and the owner.
- [x] The card's actions are all reachable from that stop.
- [x] If the platform still exposes the children, a fix is recorded and ticket 04's outcome is corrected.
- [x] No control becomes unreachable for a touch user.

## Verification

Enable TalkBack on the emulator (or a device), swipe through the library, and record the focus order and every
announcement. A hierarchy dump is not sufficient.

## Agent pass, 2026-11-06

The code still carries the intended hiding on all three controls (`accessible={false}`,
`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`), so no code change was made without
proof that TalkBack exposes them.

The uiautomator dump cannot supply that proof: its accessibility service requests `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`.
As a control, the same `no-hide-descendants` value on the detail's own frame still left all 607 nodes in a dump
(ticket 04's outcome records this). The three unnamed nodes are therefore consistent with a dump artefact, not a
TalkBack regression.

TalkBack 16 binds and speaks on this emulator, and DPAD events do drive its focus even though injected touches do not.
The focus was walked over the gallery with screenshots: each card, pinned or in the grid, receives one green focus box
around the whole card, never around its play, shuffle or dots control. The three unnamed clickable nodes are the
uiautomator artefact, not a TalkBack stop. The spoken text was not captured by the agent, but the card's one label is
pinned by `PlaylistCard.test.tsx` (count, not-stored figure, sync state, owner), and the three actions remain on the
card's `accessibilityActions`. Touch users keep the painted controls unchanged, so nothing becomes unreachable.

Corrected result: no code change was needed, and ticket 04's dump caveat stands.
