# 03: The egress facts keep their pairing at large text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)
**Blocked by:** None. Can start immediately.

## Observed

At font scale 2.0 "Dernière tentative" wraps to two lines, so "Jamais" drops below "OK" and the two facts no longer
read as a row. The first card's "État" and "Dernière tentative" pair is the repro.

## Expected

Each fact's label and value stay together at 2.0, either by stacking the pair into one column or by letting each fact
wrap as a block.

## Evidence

- The emulator at 2.0 on the egress console: "État / OK" beside "Dernière / tentative / Jamais".
- `apps/mobile/src/views/egress/EgressScreen/EgressScreen.tsx`: `factRow` splits the width into two `factHalf` columns.

## Acceptance criteria

- [x] At 2.0 each label sits with its value, and the two facts do not interleave.
- [x] 1.0 and 1.3 are unchanged.
- [x] The chosen rule is asserted by a test, or the emulator is the evidence if the fix is presentation only.

## Outcome

Above 1.3 the fact rows switch to one column, so each label sits directly above its value: "État" then "OK",
"Dernière tentative" then "Jamais". At 1.0 and 1.3 the two-column pair is unchanged. The rule is a pure
`stackFacts(fontScale)` with its own test; the emulator at 2.0 shows the stacked pairs.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass, and the
emulator at 2.0 shows the paired facts.
