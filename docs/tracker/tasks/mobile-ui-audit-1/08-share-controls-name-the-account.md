# 08: Share controls name the account

**Status:** ready-for-agent
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

- [ ] Each level button's label is the level word plus the account's display name.
- [ ] The revoke control's label is the revoke word plus the account's display name.
- [ ] The row's own identity stays a single readable element, so the name is not read twice in a row.
- [ ] The component tests assert the two labels for a named account.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `detail-share` flow passes, and TalkBack reads each control with its account.
