# 04: A gallery card is four focus stops

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** [`03`](03-the-retention-promise-has-no-word-and-no-surface.md), because a single-stop card must carry
the whole name before the parts stop being reachable on their own.

## Observed

The accessibility tree exposes each card as four independent stops: the card itself, `playlist-play`,
`playlist-shuffle` and `playlist-actions-*`. A card is one visual target, one press away from its playlist, and the
three controls are drawn over its cover.

## Expected

`docs/DESIGN.md`: "A gallery card is one target, so its name carries the count, the sync state and the owner that its
parts show." The play, shuffle and actions must stay reachable without being three extra stops on the way to the
content.

## Evidence

- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx`: one `PressableScale` with `accessibilityRole="button"`
  and `accessibilityLabel={cardLabel}`, containing three further labelled pressables.
- `uiautomator` dump of the library on 2026-11-03: four focusable nodes per card in that order.
- `docs/DESIGN.md`, "The mobile client": the sentence quoted above.

## Acceptance criteria

- [x] TalkBack stops once per card, and its name carries the count, the sync state and the owner.
- [x] Play, shuffle and actions stay reachable, through custom accessibility actions or one trailing control, with
      their own names.
- [x] No control is announced twice, and the order is card then controls.
- [x] The card's painted layout is unchanged.
- [x] A test asserts one accessible node per card with the full label.

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
