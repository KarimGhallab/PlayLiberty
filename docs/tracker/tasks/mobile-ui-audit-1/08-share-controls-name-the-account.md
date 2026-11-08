# 08: Share controls name the account

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The picker's level radios now read `level, account`: "Can listen, Ada" and "Can edit, Ada". The share sheet's revoke
control reads `Revoke, Ada`. The visible text is unchanged, and the row identity is still one element: the picker's
name line and the share sheet's `accessible` identity view. The tests query the labels by name and assert both controls
for a named account.

The Maestro `detail-share` flow asserted `selected` on the level pair; ticket 07 made them radios with `checked`, so
the flow now asserts `checked` like `detail-arrange` already did.

The `detail-share` flow passed on the emulator with `OWNED_PLAYLIST=Paradis` and `SHARE_ACCOUNT=Dev User`, and the
accessibility tree reads `Peut écouter, Dev User`, `Peut modifier, Dev User` and `Retirer, Dev User` on the level pair
and the revoke control.
