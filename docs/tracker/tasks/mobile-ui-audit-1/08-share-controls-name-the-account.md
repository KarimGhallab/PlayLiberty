# 08: Share controls name the account

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The share picker's two level buttons read their label from the visible text only, so a screen reader hears "Listen,
button, selected" and "Edit, button" with no account. The share sheet's revoke control hears only "Revoke, button".
With several rows, the account the control acts on is lost, and revoking the wrong person is destructive.

## Expected

Every control that acts on an account names that account. The visible text stays as it is.

## Evidence

- `apps/mobile/src/views/library/ShareAccountPicker/ShareAccountPicker.tsx`: the level `Pressable`s with no
  `accessibilityLabel`.
- `apps/mobile/src/views/library/ShareSheet/ShareSheet.tsx`: `share-revoke`.

## Acceptance criteria

- [x] Each level button's label is the level word plus the account's display name.
- [x] The revoke control's label is the revoke word plus the account's display name.
- [x] The row's own identity stays a single readable element, so the name is not read twice in a row.
- [x] The component tests assert the two labels for a named account.

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

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `detail-share` flow passes, and TalkBack reads each control with its account.
