# 03: The egress facts keep their pairing at large text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)

## Outcome

Above 1.3 the fact rows switch to one column, so each label sits directly above its value: "État" then "OK",
"Dernière tentative" then "Jamais". At 1.0 and 1.3 the two-column pair is unchanged. The rule is a pure
`stackFacts(fontScale)` with its own test; the emulator at 2.0 shows the stacked pairs.
