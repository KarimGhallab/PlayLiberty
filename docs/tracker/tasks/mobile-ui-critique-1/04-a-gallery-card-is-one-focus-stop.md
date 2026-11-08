# 04: A gallery card is four focus stops

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

The card carries `accessibilityActions` for play, shuffle and the actions door, and `onAccessibilityAction` routes
each to the same handler the control uses. An action is offered only while its control would act: a playlist with
nothing stored offers no play or shuffle, and a start in flight offers neither. The labels reuse the controls' own
words, so the pause case still reads "Pause <name>".

The three overlaid controls are now invisible to accessibility: `accessible={false}`,
`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`, and, the part that actually decides
it on Android, no `accessibilityLabel`, `accessibilityRole` or `accessibilityState` of their own. A clickable native
view that carries a label and a button role is exposed whatever its importance says; dropping the label is what
removes the node. Verified with `uiautomator` on the emulator: the library now shows exactly one `playlist-card` node
per card, with no `playlist-play`, `playlist-shuffle` or `playlist-actions-*` node beside it, and the card's name reads
"Chine, Vous êtes collaborateur, 71 pistes, 4 pistes ne sont pas stockées, À jour, Partagée par Dev User".

The gallery tests reach a card's controls inside that card instead of by role, so they still press the same thing a
finger presses. The card's own test covers the actions, and the disabled cases assert the disabled control rather than
pressing it: pressing a disabled control in this harness leaves an open `act` scope and breaks every later render in
the file.
