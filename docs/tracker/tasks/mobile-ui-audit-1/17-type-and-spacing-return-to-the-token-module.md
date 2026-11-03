# 17: Type and spacing return to the token module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** 01 through 16. This sweep runs last so it catches the literals the fixes introduce.

## Observed

The mobile client uses literal `fontWeight` strings in 61 places, although `packages/tokens` owns the three weights.
Several lengths are off the 4px scale: `padding: 2`, `paddingVertical: 1`, `height: 3`, `width: 5`, `width: 7`,
`height: 20`, `width: 48`, `maxHeight: 120`. The colour and type-size tokens are used correctly, so the drift is
confined to weights and small geometry.

## Expected

Every weight reads from the token module through one helper, and every recurring length reads from the space scale or
from a named token. A one-off value that is genuinely geometry stays, with the reason beside it.

## Evidence

- `packages/tokens/src/values.ts`: `weight-regular`, `weight-medium`, `weight-semibold`.
- `apps/mobile/src`: 61 literal `fontWeight` values and the off-scale lengths above.

## Acceptance criteria

- [x] No literal `fontWeight` string remains in `apps/mobile`.
- [x] The recurring off-scale lengths are tokens or come from the space scale.
- [x] Any remaining one-off length carries a one-line reason.
- [x] The rendered result is unchanged at both font scales.

## Outcome

`shared/styles/tokens` gained `tokenWeight`, the one place a weight token becomes React Native's string weight. All 59
literal weights now read `weight-medium` or `weight-semibold` through it; the two prototype files that carried the other
two weights were removed by ticket 19.

The recurring off-scale lengths came back to the scale: the scope pair's 2pt padding and gap are `space-1 / 2`, the
20pt rules are `space-5`, the 48pt sleeves are `space-9`, and the run band's 120pt raw box is `space-6 * 5`. Five
one-offs stay with a reason beside them: the seeker's 3pt track, the 5pt playing dot, the 7pt chip and egress dots, and
the egress badge's 1pt vertical nudge. The values are unchanged, so the rendered result is the same at both font
scales.

`rg "fontWeight: '" apps/mobile/src` returns nothing. The suites, typecheck, lint and build pass.

## Verification

`rg "fontWeight: '" apps/mobile/src` returns nothing. `pnpm --filter @playliberty/mobile run test`,
`pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
