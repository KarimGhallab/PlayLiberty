# 17: Type and spacing return to the token module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

`shared/styles/tokens` gained `tokenWeight`, the one place a weight token becomes React Native's string weight. All 59
literal weights now read `weight-medium` or `weight-semibold` through it; the two prototype files that carried the other
two weights were removed by ticket 19.

The recurring off-scale lengths came back to the scale: the scope pair's 2pt padding and gap are `space-1 / 2`, the
20pt rules are `space-5`, the 48pt sleeves are `space-9`, and the run band's 120pt raw box is `space-6 * 5`. Five
one-offs stay with a reason beside them: the seeker's 3pt track, the 5pt playing dot, the 7pt chip and egress dots, and
the egress badge's 1pt vertical nudge. The values are unchanged, so the rendered result is the same at both font
scales.

`rg "fontWeight: '" apps/mobile/src` returns nothing.
