# 01: The track row is one target for the screen reader

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The title, the state word and the duration sit in wrappers that take `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"` while the play layer exists. The failure sentence moved out of the
hidden state wrapper, so a playable row whose source broke still reads it, and the disclosure stays a sibling of the
hidden copy. An unplayable row passes no hiding props, so its copy reads as before.

The row test now asserts the play label as the row's one button, the hidden title and duration, the sentence, the
disclosure and the lane. The emulator's dump of the detail lists `track-play` and `track-actions` as the row's only
focusable nodes; `track-title` and `track-duration` are still drawn but `focusable="false"`, the same shape the gallery
card's hidden content already had.
