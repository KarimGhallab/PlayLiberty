# 11: The card's overlaid controls are still clickable nodes

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

No code change was needed. The three controls still carry the intended hiding (`accessible={false}`, `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`), and the uiautomator dump cannot prove they are exposed: its accessibility service requests `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`, and the same `no-hide-descendants` value on the detail's own frame still left all 607 nodes in a dump.

TalkBack 16 binds on the emulator, and DPAD events drive its focus. Walked over the gallery with screenshots, each card, pinned or in the grid, receives one green focus box around the whole card, never around its play, shuffle or dots control. The spoken text was not captured, but the card's one label is pinned by `PlaylistCard.test.tsx` (count, not-stored figure, sync state, owner), and the three actions remain on the card's `accessibilityActions`.

Ticket 04's dump caveat stands.
