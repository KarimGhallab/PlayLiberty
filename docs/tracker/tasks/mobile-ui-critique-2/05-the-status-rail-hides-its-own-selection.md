# 05: The status rail hides its own selection

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06, with the user's rule kept: the default status chip is never scrolled to.

The rail's fixed prefix was the cause, so the words got shorter rather than the scroll: the scope pair reads `Shared` /
`Partagées` instead of `Shared with me` / `Partagées avec moi`, and the default status chip reads `All` / `Toutes` instead
of `All tracks` / `Toutes les pistes`. The gallery's default chip is now fully visible at 1.0 in French, the longest
catalog, and in English.

From 1.3 the scope pair moves to its own row (`stacksScope`, with a 0.005 tolerance because the platform stores 1.3 as
1.29999995). The status rail then owns the full viewport: its default chip is whole and the end fade marks that more
chips follow. The pair stays a compact pill, left-aligned above the rail. Below 1.3 the pair stays inline.

The default `All` chip is never auto-scrolled. The gallery keeps its existing rule (reveal only a chosen or restored
non-default chip, restored without animation). The detail's rail gained the same split: a restored non-default filter is
revealed on its chip's first measurement without a tween, a tapped one is revealed with the animation, and the default
is left where it rests.

Verified on the emulator at 1.0, 1.3 and 2.0 in French (`/tmp/opencode/t05/lib-1.0-fr.png`, `lib-1.3-fr3.png`,
`lib-2.0-fr.png`): the default chip is whole at each size, the pair stacks from 1.3, and one swipe at 1.0 brings the
retained chip onto the screen (`rail-swiped-1.0.png`).

The root build, lint and unit run follows in the batch for this
session.
