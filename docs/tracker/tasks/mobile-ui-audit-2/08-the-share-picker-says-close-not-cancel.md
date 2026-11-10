# 08: The share picker says close, not cancel

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The footer uses `shareDialog.done`, which is "Done" in English and "Terminé" in French, instead of `common.cancel`. The
picker still closes without a grant when the footer is pressed, and no copy says a grant can be undone. The close test
now asserts the label. The emulator shows "Terminé" under the account row.
