# 18: Small surface drift returns to the system

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The signed-out action's `↗` text is now `IconArrowUpRight` at `icon-sm` from Tabler, and the unused arrow style is gone.
`NotFound`'s back label carries `fontFamily`.

The run band's failure callout and the signed-out failure panel both use the system's surface plate: a 1pt `line`
border, `radius-card` and the `surface` ground, with the failure tone kept on the sentence. The coloured left border is
gone from both.

`Notice` gained the `horizontalInset` the snackbar already had. The gallery passes 0 so its 16pt parent padding leaves
the same 16pt screen edge the detail has; the gallery snackbar passes 0 for the same reason. The signed-out door
screenshot shows the Tabler arrow, and the failure plates are covered by the component suites.
