# 08: The share picker says close, not cancel

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The footer button is `t('common.cancel')` ("Annuler"). Choosing a level applies the grant immediately and closes the
sheet, so the button only closes; it cannot undo the grant.

## Expected

The footer says "Fermer" / "Close" or "Terminé" / "Done", and does not imply the grant can be undone.

## Evidence

- `apps/mobile/src/views/library/ShareAccountPicker/ShareAccountPicker.tsx`: the footer button and `choose`, which
  mutates and closes on success.
- `packages/i18n/src/en.ts` and `fr.ts`: `common.cancel`.

## Acceptance criteria

- [x] The footer label says close or done in both languages.
- [x] No other copy implies the grant is undoable.
- [x] A test asserts the label.

## Outcome

The footer uses `shareDialog.done`, which is "Done" in English and "Terminé" in French, instead of `common.cancel`. The
picker still closes without a grant when the footer is pressed, and no copy says a grant can be undone. The close test
now asserts the label. The emulator shows "Terminé" under the account row.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass; the emulator
shows the new label.
