# 09: Reduced motion still translates two panels

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. Both gesture paths now skip the travel under reduced motion while keeping the release
decision.

`PlayerBar`'s `onPanResponderMove` returns before it writes the deck's offset, so the finger no longer drags a page
width; `onPanResponderRelease` is untouched, so the same `width * 0.26` / `24dp + 0.4` thresholds decide the skip, and
`complete`/`settleBack` cut to the result without a tween as they already did. `Sheet`'s drag move returns before
`translateY` and the scrim opacity are written; the release still calls `dismissesOnDrag` and closes, so the drag,
backdrop, close control and back gesture are unchanged.

The `reduceMotion` dependency is explicit in the bar's responder memo; the sheet's memo already had it.

Verified on the emulator with both scales at 0. A swipe on the bar held at its origin (`/tmp/opencode/t09/bar-midswipe-rm2.png`),
and a drag on the account sheet left the panel still (`sheet-rm-middrag.png`). Restoring both scales to 1 and repeating
the same captured swipe moved the deck and skipped to 2/67 (`bar-midswipe-motion.png`, `bar-after-motion.png`), which
confirms the capture reached the gesture. Both scales were restored to 1.

`PlayerBar.test.tsx` drives a move and a committed release under reduced motion and asserts the deck stays at 0 and the
queue advances; `Sheet.test.tsx` drives a move and a dismissing release and asserts the panel's translate is unchanged
while `onRequestClose` fires.

The root build, lint and unit run follows in the batch for this session.
